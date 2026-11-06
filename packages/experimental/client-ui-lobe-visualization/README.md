---
description: "Optional artifact, tool-process and agent-profile visualization for the Web GUI."
kind: "package-bundle"
---

# @deepseek-ai/dsh-client-ui-lobe-visualization

English | [中文](README.zh.md)

<a id="summary"></a>
## Summary

An opt-in browser plugin independently implementing [LobeHub](https://github.com/lobehub/lobehub)-inspired interaction patterns with Harness slots: source-first HTML/SVG artifacts, Bash/edit process cards, and read-only agent identity and preset declarations. It adds no LobeHub server, database or agent runtime.

<a id="table-of-contents"></a>
## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

The included `cordis.patch.yml` inserts this plugin when its bundle is installed into a Web profile providing Slots, locale and the agent-preset remote API. Shipped defaults do not load it. Build the package before installation; local-directory and tarball installation are described in the [plugin publication tutorial](../../../docs/user/develop/basic/publish.md). Building the package does not update a running desktop installation.

```sh
pnpm --filter @deepseek-ai/dsh-client-ui-lobe-visualization bundle
```

Successful HTML/HTM/SVG write records offer Source and Interactive preview. Source is the initial view; selecting preview creates the browsing context from recorded content, not a later filesystem read. Returning to source or collapsing the card destroys it, and Restart preview creates a fresh context. Failed, stopped, incomplete and unsupported writes retain their recorded data without a runnable preview.

The preview uses an opaque script-enabled iframe without same-origin, top-level navigation, form or popup permissions. The initial document policy limits external scripts, styles, images and connections. The iframe can navigate itself to another document where that policy does not persist, so this preview is not a network-isolation or data-loss-prevention mechanism. The default document canvas stays light independently of the outer theme; later artifact styles can replace it.

Bash/edit cards preserve raw input, results and inspection actions. Process exit failure is distinct from successful tool-envelope delivery; background launches remain running on their launch record, with final outcome owned by the job tools. Edit also exposes the file-opening action. Other tools keep their native views.

The session-header Agent profile action reads the recorded preset identity and its current real name, description and YAML. The view is read-only. Native preset settings still select presets for new sessions; this plugin never switches a running session's composition.

<a id="understand-the-implementation"></a>
## Understand the implementation

The three domains contribute to existing tool-view and session-header slots. Explicit priorities shadow the native tool entries; effect disposal restores them. No polling, global DOM injection, agent-loop changes, new configuration-writing API or Session-format changes are involved. Preset declarations come from the existing `remote.agentPresets.read` operation.

<a id="model-experience"></a>
## Model Experience

None, as this plugin only presents existing records without adding prompts, tools, model-visible input or model-request tokens.

#### KV Cache effect

No change to request prefixes or caching.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Artifacts support single-file HTML/HTM/SVG from successful write calls. React/TSX, external dependencies, relative resources and LobeHub-specific Markdown artifact tags are not executed; source remains inspectable.
- The profile shows the preset's current declaration, not a historical snapshot of the session's effective startup configuration.
- Configuration editing is unavailable here; the host has no stable header-plugin navigation operation for its preset editor.
- Tool presentation covers Bash, edit and write; background launch records are not final success records.
- English and Chinese copy are complete; the other six shipped locales use English labels.

<a id="dev-note"></a>
### Dev Note

This experimental opt-in needs designer/product approval before landing. Component and real-Web fixture tests do not establish real-model execution or installation in the user's running GUI.
