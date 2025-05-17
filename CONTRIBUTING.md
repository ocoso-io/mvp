## Welcome to OCOSO-MVP Project

Thank you for your interest in contributing to our project. This document provides guidelines to help you contribute
effectively.

## Project Overview
OCOSO-MVP is a web component library for NFT (Non-Fungible Token) functionality. It provides reusable, accessible components for displaying and interacting with NFTs in web applications. The project focuses on modularity, performance, and standards compliance.

## Installation and Setup

1. Clone the repository
   ```
   git clone ssh://git@gitlab.trebega.de:10022/ocoso/mvp/mvp.git
   ```
2. Install dependencies
   ```
   npm install
   ```
3. Run development server
   ```
   npm run dev
   ```

## Branching Strategy

### Feature Branches

- Create a separate feature branch for each feature
- Include the issue number in the branch name to ensure clear traceability
- Format: `feature/ISSUE-NUM-short-description`
- Example: `feature/42-nft-filter-component`

## Commit Guidelines

All commits must follow the Semantic Commit format:

``` 
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Formatting, missing semicolons, etc. (no code change)
- **refactor**: Code refactoring without functionality change
- **test**: Adding or correcting tests
- **chore**: Changes to build processes or auxiliary tools

### Examples

``` 
feat(table): add sortable columns to NFT table
fix(authentication): resolve token expiration issue
docs(api): update filter parameter descriptions
```

## Code Standards

- Use standard styles of the respective programming languages
- This also applies to indentation and spacing
- For JavaScript/TypeScript, we use ESLint with standard configurations
- For HTML/CSS, we follow general best practices

## Testing Guidelines
- Write unit tests for all new functionality
- Ensure test coverage is at least 80%
- Run the full test suite before submitting a PR:
  ```
  npm test
  ```
- Integration tests are required for UI components
- E2E tests are required for critical user flows


## Documentation

- Document APIs according to the standard of the respective language
- For JavaScript/TypeScript, use JSDoc
- For Java, use Javadoc
- All public methods and classes must be documented

## Issue Management

- All tasks are tracked via the issue board
- Error reports must be submitted exclusively through the issue board
- Issues should be described in as much detail as possible
- For bugs: include steps to reproduce, expected and actual behavior

## Pull Request Process

1. Ensure your code complies with the guidelines mentioned above
2. Create a pull request against the main branch
3. Link the associated issue in the pull request
4. Wait for code reviews and make adjustments if necessary
5. After approval, the pull request will be merged

## Development Environment

Ensure you use the correct development environment:

- Node.js and npm in the appropriate versions
- For Java developers: Java SDK 21
- TypeScript version 5.8.3
- Use packages as defined in the project

## Release Management

We follow a scheduled release cycle with versions released every two weeks. Major features are bundled into milestone
releases.

## File Naming Conventions

- Component files: PascalCase.ts
- Test files: ComponentName.test.ts
- Utility files: kebab-case.ts

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/). Version numbers follow the pattern: MAJOR.MINOR.PATCH.

## Security
- If you discover a security vulnerability, please do NOT open a public issue
- Instead, send details to security@ocoso.io
- For non-critical issues, you may open an issue with the tag [SECURITY]

## Getting Help

If you have questions, you can:

- Create an issue
- Consult the documentation
- Contact the development team

## License

See the [LICENCE](LICENSE) file for details.

Thank you for your contribution!
