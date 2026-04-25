# Contributing to Noxt

Thank you for your interest in contributing to this project! We welcome contributions of all kinds: bug fixes, feature implementations, documentation improvements, and more.

## How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch** from `main`
3. **Make your changes** following the style guide below
4. **Commit your changes** with clear, descriptive messages
5. **Push to your fork**
6. **Open a Pull Request** to the main repository

All contributions must be proposed via Pull Requests. Direct commits to `main` are not accepted.

## Pull Request Guidelines

- Fill out the PR template completely
- Reference any related issues
- Keep PRs focused and atomic — one feature or fix per PR
- Ensure all tests pass before submitting
- Update documentation for any behavior changes

## Style Guide

### Code Organization

- **Function size**: Keep functions small and focused. A function should do one thing and do it well. Aim for under 40-50 lines as a general guideline.

### Documentation

- **All exported functions must be documented** with JSDoc-style comments describing:
  - Purpose of the function
  - Parameters and their types
  - Return value and type
  - Any side effects

### Comments

- **Comments are for unintuitive behavior only** — not for stating the obvious
- Do not add comments that simply repeat what the code already clearly expresses
- Use comments to explain _why_ (the reasoning) when the code's _what_ doesn't make the _why_ obvious
- Avoid inline comments; prefer clear code and well-named variables

### Other Guidelines

- Use consistent indentation (2 or 4 spaces — match existing code)
- Follow existing naming conventions in the codebase
- Keep commits atomic and well-described

## Documentation

**Documentation must be updated whenever behavior changes.**

- Update README files if your change affects how users interact with the project
- Update function documentation when signatures or behavior changes
- Add examples where helpful
- Keep docs consistent with implementation

## Code Review

All contributions will be reviewed. Please be patient and responsive to feedback. We may ask for changes to align with project standards.

---

By contributing to this project, you agree to license your contributions under the same license as the project.
