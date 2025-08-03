// src/services/agent.core.service.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BufferMemory, ConversationSummaryBufferMemory } from "langchain/memory";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { PrismaClient } from '@prisma/client';
import { executeToolFunction } from './tools.service.js';

const prisma = new PrismaClient();

export class GeminiAgentWithMemory {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.options = {
      modelName: options.modelName || "gemini-1.5-pro",
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2048,
      memoryType: options.memoryType || "buffer",
      maxMemorySize: options.maxMemorySize || 10,
      ...options
    };
    this.llm = null;
    this.memory = null;
    this.tools = [];
    this.agentExecutor = null;
    this.agentId = null;
  }

  async initialize(agentId, tools = []) {
    this.agentId = agentId;
    await this.initializeLLM();
    await this.initializeMemory(agentId);
    this.initializeTools(tools); // Pass tools here
    await this.createAgent();
  }

  async initializeLLM() {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      modelName: this.options.modelName,
      temperature: this.options.temperature,
      maxOutputTokens: this.options.maxTokens,
    });
  }

  async initializeMemory(agentId) {
    const conversationHistory = await this.loadConversationHistory(agentId);
    const memoryOptions = {
      returnMessages: true,
      inputKey: "input",
      outputKey: "output"
    };

    if (this.options.memoryType === "summary") {
      this.memory = new ConversationSummaryBufferMemory({
        ...memoryOptions,
        llm: this.llm,
        maxTokenLimit: this.options.maxMemorySize * 100,
      });
    } else {
      this.memory = new BufferMemory({
        ...memoryOptions,
        k: this.options.maxMemorySize,
      });
    }

    for (const message of conversationHistory) {
      if (message.userMessage && message.agentResponse) {
        await this.memory.chatHistory.addUserMessage(message.userMessage);
        await this.memory.chatHistory.addAIMessage(message.agentResponse);
      }
    }
  }

  async loadConversationHistory(agentId) {
    return prisma.agentExecution.findMany({
      where: { agentId, success: true },
      orderBy: { createdAt: 'asc' },
      take: this.options.maxMemorySize,
      select: { userMessage: true, agentResponse: true }
    });
  }

  initializeTools(agentTools) {
    this.tools = agentTools.map(tool =>
      new DynamicTool({
        name: tool.name,
        description: tool.description,
        func: async (input) => {
          try {
            let params = typeof input === 'string' ? { query: input } : input;
            const result = await executeToolFunction(tool, params);
            return JSON.stringify(result);
          } catch (error) {
            console.error(`Error executing tool ${tool.name}:`, error);
            return `Error: ${error.message}`;
          }
        }
      })
    );

    this.tools.push(new DynamicTool({
      name: "searchMemory",
      description: "Searches the user's conversation history for specific information.",
      func: async (query) => {
        const memoryContext = await this.memory.loadMemoryVariables({});
        const history = memoryContext.history?.toString() || "";
        const relevantParts = history.split('\n')
          .filter(line => line.toLowerCase().includes(query.toLowerCase()))
          .slice(-5);
        return relevantParts.length > 0
          ? `Found in history: ${relevantParts.join('\n')}`
          : "No relevant information found in history.";
      }
    }));
  }

  async createAgent() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.options.systemPrompt || "You are a helpful assistant."],
      ["human", "{input}"],
      ["ai", "{agent_scratchpad}"]
    ]);

    const reactAgent = await createReactAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    this.agentExecutor = new AgentExecutor({
      agent: reactAgent,
      tools: this.tools,
      memory: this.memory,
      verbose: process.env.NODE_ENV === 'development',
      maxIterations: 7,
      returnIntermediateSteps: true,
      handleParsingErrors: "Please try again, paying close attention to the anction format.",
    });
  }

  async processMessage(message, executionId, userId = null) {
    const startTime = Date.now();
    try {
      const result = await this.agentExecutor.invoke({ input: message, userId });
      const executionTime = Date.now() - startTime;
      const toolsUsed = result.intermediateSteps?.map(step => ({
        tool: step.action?.tool,
        input: step.action?.toolInput,
        output: step.observation,
      })) || [];

      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          agentResponse: result.output,
          toolsUsed: JSON.stringify(toolsUsed),
          success: true,
          executionTime,
        },
      });

      return { response: result.output, toolsUsed };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Error processing message for agent ${this.agentId}:`, error);
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          agentResponse: "An error occurred while processing your request.",
          success: false,
          errorMessage: error.message,
          executionTime,
        },
      });
      return {
        response: "An error occurred. Please try again.",
        error: error.message
      };
    }
  }
}

export class AgentManager {
  constructor(geminiApiKey) {
    this.geminiApiKey = geminiApiKey;
    this.agents = new Map();
  }

  async getAgent(agentId) {
    if (this.agents.has(agentId)) {
      return this.agents.get(agentId);
    }

    const agentData = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        tools: { include: { tool: true } },
        config: true,
        parentAgent: { include: { config: true } },
        organization: { include: { instance: true } },
      }
    });

    if (!agentData) throw new Error(`Agent ${agentId} not found.`);

    // Inherit config from parent if not set on child
    const config = agentData.config || agentData.parentAgent?.config || {};
    const options = {
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: agentData.persona || config.systemPrompt,
    };

    const agent = new GeminiAgentWithMemory(this.geminiApiKey, options);
    const tools = agentData.tools.map(t => t.tool);

    await agent.initialize(agentId, tools);
    this.agents.set(agentId, agent);
    return agent;
  }

  async processMessage(agentId, message, executionId, userId = null) {
    const agent = await this.getAgent(agentId);
    return agent.processMessage(message, executionId, userId);
  }
}
