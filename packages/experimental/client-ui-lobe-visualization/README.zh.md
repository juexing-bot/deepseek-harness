---
description: "为 Web GUI 提供可选的交互产物、工具过程和 Agent 角色配置可视化。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-client-ui-lobe-visualization

[English](README.md) | 中文

<a id="summary"></a>
## 概述

这是参考 [LobeHub](https://github.com/lobehub/lobehub) 交互模式、基于 Harness 插槽独立实现的可选浏览器插件：提供默认查看源码的 HTML/SVG 产物、Bash/edit 过程卡片，以及只读的角色身份和预设声明。它不安装 LobeHub 的服务端、数据库或 Agent 运行时。

<a id="table-of-contents"></a>
## 目录

- [使用本包](#use-this-package)
- [实现说明](#understand-the-implementation)
- [模型体验](#model-experience)
- [限制与后续工作](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

<a id="use-this-package"></a>
## 使用本包

随包的 `cordis.patch.yml` 在安装组合包时插入本插件；目标 Web profile 需提供 Slots、locale 和角色预设远程 API。默认产品配置不加载它。安装前先构建，目录与 tarball 安装方式见[插件发布教程](../../../docs/user/develop/basic/publish.zh.md)。构建本包不会替换已经运行的桌面安装包。

```sh
pnpm --filter @deepseek-ai/dsh-client-ui-lobe-visualization bundle
```

HTML、HTM 和 SVG 的成功 write 记录显示“源码 / 交互预览”选项。默认显示源码，选择预览才从记录内容创建浏览上下文，不重新读取可能已改变的文件。切回源码或收起卡片会销毁上下文，“重新运行预览”创建新上下文。失败、停止、参数不完整或不支持的文件类型保留记录数据，不提供可运行预览。

预览使用不具有同源、顶层导航、表单或弹窗权限的脚本 iframe。初始文档策略限制外部脚本、样式、图片和连接。iframe 可以自行导航到新文档，届时该策略不再延续，因此此预览不能作为网络隔离或数据防泄漏机制。默认文档画布保持浅色，不受外框主题影响；产物后续样式可以替换它。

Bash/edit 卡片保留原始输入、结果和调用查看入口。进程非零退出与工具封装成功分开显示；后台启动记录保持运行中，最终结果仍由任务工具负责。edit 还提供文件打开入口。其他工具保留原生视图。

会话标题栏的“角色与配置”入口读取记录的预设身份及其当前真实名称、描述和 YAML。该视图只读。新会话的预设选择仍由原生预设设置负责；本插件不会切换运行中会话的组合。

<a id="understand-the-implementation"></a>
## 实现说明

三个域通过既有工具视图和会话标题栏插槽组合。明确的优先级覆盖原生工具项，释放副作用后恢复它们。实现没有轮询、全局 DOM 注入、Agent 循环改动、新配置写入 API 或 Session 格式变更。预设声明来自既有的 `remote.agentPresets.read` 操作。

<a id="model-experience"></a>
## 模型体验

无，因为本插件只呈现已有记录，不新增提示词、工具或模型可见输入，也不改变模型请求的 token 内容。

#### KV Cache 影响

不改变请求前缀或缓存行为。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 产物支持成功 write 的单文件 HTML/HTM/SVG。预览显示当次写入记录，不跟踪后续文件编辑。React/TSX、外部依赖、相对资源和 LobeHub 自定义 Markdown 产物标签不会执行；源码仍可查看。
- 角色页面展示预设当前声明，不是会话实际启动配置的历史快照。
- 此处不支持编辑配置；宿主没有面向该标题栏插件的稳定预设编辑器导航操作。
- 工具呈现覆盖 Bash、edit 和 write；后台启动记录不代表最终成功。
- 中英文案完整，其余六种内置语言使用英文标签。

<a id="dev-note"></a>
### 开发备注

此实验性可选能力在合入前需要设计或产品审核。组件测试和真实 Web 夹具测试不能证明真实模型执行，也不能证明已安装到用户当前运行的 GUI。
