# VibePlay Engine Development Guide

## Commands
- **Build**: `npm run build`
- **Dev server**: `npm run dev`
- **Lint**: `npm run lint`
- **Type check**: `npm run typecheck`
- **Test all**: `npm run test`
- **Test single file**: `npm run test -- path/to/test.ts`

## Code Style Guidelines
- Use TypeScript with strict typing
- 2-space indentation 
- Private variables with underscore prefix (_varName)
- PascalCase for classes, camelCase for variables and methods
- Interface-based design with explicit member visibility (public, private)
- Always implement Disposable interface for proper resource cleanup
- Add JSDoc comments for public methods

## Engine Architecture Rules
- Always update memory in mem.md when making significant changes
- Follow ECS pattern where appropriate
- Use lazy loading for optional systems
- Properly dispose Three.js objects to prevent memory leaks
- Use EventEmitter for loose coupling between systems
- Read the architecture documentation in src/llm-docs/ first