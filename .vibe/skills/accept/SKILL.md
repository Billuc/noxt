---
name: accept
description: Accept changes made by the agent
license: MIT
user-invocable: true
allowed-tools:
  - bash
  - ask_user_question
---

# Accept Skill

This skill marks the changes made as accepted.

The accepted changes should be staged using Git.
The Git command to use is `git add .` to stage all changes.
