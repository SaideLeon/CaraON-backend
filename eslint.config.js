module.exports = [
  {
    'files': ['**/*.js'],
    'languageOptions': {
      'ecmaVersion': 2021,
      'sourceType': 'commonjs',
      'globals': {
        'process': 'readonly',
        'require': 'readonly',
        'module': 'readonly',
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
        'windows'
      ],
      'quotes': [
        'error',
        'single'
      ],
      'semi': [
        'error',
        'always'
      ]
    }
  }
];
