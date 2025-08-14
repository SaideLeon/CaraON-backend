module.exports = [
  {
    'files': ['**/*.js'],
    'languageOptions': {
      'ecmaVersion': 2021,
      'sourceType': 'module',
      'globals': {
        'process': 'readonly',
        '__dirname': 'readonly'
      }
    },
    'rules': {
      'indent': [
        'error',
        2
      ],
      'linebreak-style': [
        'error',
        'unix'
      ],
      'semi': [
        'error',
        'always'
      ]
    }
  }
];
