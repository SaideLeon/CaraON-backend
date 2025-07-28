import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extende o Zod para suportar .openapi()
extendZodWithOpenApi(z);

const UserRegistrationBody = z.object({
  name: z.string().min(3, 'O nome precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome do usuário' }),
  email: z.string().email('Email inválido.').openapi({ description: 'Email do usuário' }),
  password: z.string().min(6, 'A senha precisa ter no mínimo 6 caracteres.').openapi({ description: 'Senha do usuário' }),
}).openapi({
  examples: [
    {
      name: "Tony Stark",
      email: "tonystark@example.com",
      password: "IronMan@123"
    }
  ]
});

const userRegistrationSchema = z.object({
  body: UserRegistrationBody.openapi({ refId: 'UserRegistration' }),
});

const UserLoginBody = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string(),
}).openapi({
  examples: [
    {
      email: "tonystark@example.com",
      password: "IronMan@123"
    }
  ]
});

const userLoginSchema = z.object({
  body: UserLoginBody.openapi({ refId: 'UserLogin' }),
});

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
}).openapi({refId: 'UserResponse'});

const TokenResponseSchema = z.object({
  token: z.string(),
  user: UserResponseSchema,
}).openapi({refId: 'TokenResponse'});

registry.register('UserRegistration', UserRegistrationBody);
registry.register('UserLogin', UserLoginBody);
registry.register('UserResponse', UserResponseSchema);
registry.register('TokenResponse', TokenResponseSchema);

export {
  userRegistrationSchema,
  userLoginSchema,
  UserRegistrationBody,
  UserLoginBody,
  UserResponseSchema,
  TokenResponseSchema,
};