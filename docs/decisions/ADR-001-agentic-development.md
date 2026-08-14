# ADR-001: Agentic Development Workflow

**Status:** Accepted

## Context

Tiler is intended to be developed with coding agents. Without explicit project rules, agents can make broad architectural assumptions, duplicate functionality, mix concerns, or implement future features prematurely.

## Decision

The repository itself is the primary source of truth for agent instructions, architecture, decisions, tests and development workflow.

Development will proceed in explicit phases. Each phase must have a clear scope and acceptance criteria. Agents should implement only the requested phase.

The core product architecture separates:

- image generation
- deterministic tile processing
- deterministic validation
- presentation/export

The image-generation model is replaceable through a provider abstraction. The core tile engine and validation system must not depend on a particular model.

## Consequences

- Agents have smaller, safer tasks.
- Model experiments do not require rewriting the application.
- Deterministic validation remains independent from generative AI.
- Architecture decisions become recoverable project knowledge.
- Some work will take longer because phases are deliberately validated before proceeding.
