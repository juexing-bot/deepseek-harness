#!/usr/bin/env python3
"""从实际验证产物生成中文、自包含的交付概览；不手写测试数字。"""
import argparse
import base64
import html
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'docs/evidence/lobe-visualization'
TOPIC = ROOT / 'ops/lobe-visualization'
META = json.loads((TOPIC / 'delivery.json').read_text())
REGRESSION = ROOT / '.playwright-mcp/lobe-visualization/regression/summary.json'
parser = argparse.ArgumentParser(description=__doc__)
for name in ['build-log', 'check-log', 'docs-log']:
    parser.add_argument('--' + name, type=Path, required=True)
parser.add_argument('--model-report', type=Path)
ARGS = parser.parse_args()


def junit(name):
    """按真实 JUnit 用例统计通过、失败与不适用项。"""
    cases = list(ET.parse(name if isinstance(name, Path) else EVIDENCE / name).getroot().iter('testcase'))
    failed = sum(case.find('failure') is not None or case.find('error') is not None for case in cases)
    skipped = sum(case.find('skipped') is not None for case in cases)
    return {'total': len(cases), 'passed': len(cases) - failed - skipped, 'failed': failed, 'skipped': skipped}


def check_log(path):
    """只接纳有最终计数摘要的检查日志；缺失记录不视作通过。"""
    source = Path(path).read_text() if Path(path).is_file() else ''
    matches = re.findall(r'run-gates: (\d+) passed, (\d+) failed, (\d+) skipped', source)
    if not matches:
        return {'state': '无最终记录'}
    passed, failed, skipped = map(int, matches[-1])
    return {'state': '通过' if failed == 0 else '失败', 'passed': passed, 'failed': failed, 'skipped': skipped}


stats = {'unit': junit('unit.xml'), 'browser': junit('browser.xml')}
stats['regression'] = json.loads(REGRESSION.read_text())['totals']
stats['gui'] = junit(ROOT / '.playwright-mcp/lobe-visualization/gui.xml')
stats['gui_recheck'] = junit(ROOT / '.playwright-mcp/lobe-visualization/gui-recheck.xml')
stats['domains'] = len([path for path in (ROOT / 'packages/experimental/client-ui-lobe-visualization/src/client').iterdir() if path.is_dir()])
stats['screenshots'] = len(list(EVIDENCE.glob('*.png')))
if ARGS.model_report is not None:
    model_report = json.loads(ARGS.model_report.read_text())
    if not model_report['completed'] or not model_report['realModel'] or model_report['errors'] or model_report['toolCalls'] < 3:
        raise ValueError('真实模型演示报告没有完成必需的工具和界面检查')
    stats['real_model'] = {'verified': True, 'tool_calls': model_report['toolCalls'], 'browser_errors': len(model_report['errors']), 'provider': model_report['provider'], 'model': model_report['model'], 'reasoning_effort': model_report['reasoningEffort'], 'stopped_after_tools': model_report['stoppedAfterTools']}
else:
    stats['real_model'] = {'verified': False}
stats['checks'] = {name: check_log(path) for name, path in [('产物构建', ARGS.build_log), ('使用方类型检查', ARGS.check_log), ('文档同步', ARGS.docs_log)]}
(EVIDENCE / 'metrics.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2) + '\n')


def esc(value):
    return html.escape(str(value))


def image(name, caption):
    path = EVIDENCE / name
    payload = base64.b64encode(path.read_bytes()).decode()
    return f'<figure><img src="data:image/png;base64,{payload}" alt="{esc(caption)}"><figcaption>{esc(caption)}</figcaption></figure>'


def bar(label, passed, total):
    width = 0 if total == 0 else round(360 * passed / total, 2)
    return f'<div class="bar"><span>{esc(label)}</span><svg viewBox="0 0 360 18" role="img" aria-label="{passed}/{total}"><rect width="360" height="18" rx="4" fill="#e8e9e9"/><rect width="{width}" height="18" rx="4" fill="#3b6b66"/></svg><b>{passed}/{total}</b></div>'


kpis = ''.join(f'<div class="kpi"><b>{value}</b><span>{label}</span></div>' for value, label in [(stats['domains'], '可视化域'), (stats['unit']['passed'], '组件、卸载与目录回归通过'), (stats['browser']['passed'], '真实 Web 场景用例通过'), (stats['screenshots'], '实际应用截图')])
checks = ''.join(f'<tr><td>{esc(name)}</td><td>{esc(result["state"])}</td></tr>' for name, result in stats['checks'].items())
limitations = ''.join(f'<li>{esc(item)}</li>' for item in META['limitations'])
commands = '\n'.join(META['commands'])
comparisons = ''.join('<h3>' + title + '</h3><div class="pair">' + image(f'before-{theme}.png', 'Before · 原生视图，插件关闭') + image(f'after-{theme}.png', 'After · 同一测试记录，插件启用') + '</div>' for theme, title in [('light', '浅色 · 相同视口与记录'), ('dark', '深色 · 相同视口与记录'), ('constrained', '受限宽度 · 相同视口与记录')])
real_evidence = '<p>未提供真实模型演示报告。</p>'
if stats['real_model']['verified']:
    real_evidence = f'<h3>真实模型驱动的交互验收</h3><p>正常 DeepSeek 账号路由、{esc(stats["real_model"]["reasoning_effort"])} 推理设置；{stats["real_model"]["tool_calls"]} 次实际工具调用及文件结果已核对，浏览器未处理错误 {stats["real_model"]["browser_errors"]} 项。三次工具成功后通过正常停止按钮结束冗长摘要，再验证原始写入记录的计数器和预设声明；不把它当延迟基准或完整自然语言回合完成证明。最终 GIF 的准确修订、模式与区间见 PR。</p><div class="pair">' + image('real-artifact.png', '真实模型 · 写入记录预览，点击后实际显示 1') + image('real-agent.png', '真实应用 · 动画结束后的当前预设声明') + '</div>'
pr = '' if not META.get('pr_url') else f'<p><a href="{esc(META["pr_url"])}">查看移植 PR（{esc(META["state"])}）</a></p>'
review = ''.join(f'<tr><td>{esc(row["lens"])}</td><td>{esc(row["question"])}</td><td>{esc(row["result"])}</td></tr>' for row in META['blindspot_review'])
reg = stats['regression']
chart = bar('组件、卸载与目录回归', stats['unit']['passed'], stats['unit']['total']) + bar('Web 回放（适用项）', stats['browser']['passed'], stats['browser']['total'] - stats['browser']['skipped']) + bar('基线样式回归', reg['base_tests'] - reg['base_fail'], reg['base_tests']) + bar('当前样式回归', reg['cur_tests'] - reg['cur_fail'], reg['cur_tests'])
output = f'''<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LobeHub 可视化移植概览</title>
<style>*{{box-sizing:border-box}}body{{margin:0;color:#263138;background:#f4f3ee;font:16px/1.7 system-ui,"PingFang SC",sans-serif}}main{{max-width:1200px;margin:auto;padding:44px 26px}}header{{border-top:5px solid #3b6b66;padding-top:20px}}h1{{font-size:32px;line-height:1.3}}h2{{margin-top:44px}}h3{{font-size:17px}}.lead{{font-size:20px}}.status{{background:#fff2d9;padding:18px;border-left:4px solid #aa6b19}}.kpis{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}}.kpi{{background:white;border:1px solid #ddd;padding:18px}}.kpi b{{display:block;font-size:32px}}.kpi span,figcaption{{font-size:13px;color:#5c696b}}.pair{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}figure{{margin:0}}img{{width:100%;height:auto;border:1px solid #d3d8d8}}table{{border-collapse:collapse;width:100%;background:white}}td,th{{padding:10px 14px;border-bottom:1px solid #ddd;text-align:left}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;padding:18px;font-size:13px}}.bar{{display:grid;grid-template-columns:190px 1fr 70px;gap:14px;align-items:center;margin:12px 0}}svg{{width:100%;height:18px}}a{{color:#295f74}}footer{{font-size:13px;color:#5c696b;margin-top:36px}}@media(max-width:800px){{.pair,.kpis{{grid-template-columns:1fr}}.bar{{grid-template-columns:1fr}}main{{padding:24px 16px}}}}</style>
<main><header><p>DeepSeek Harness · 可选可视化移植</p><h1>交互产物、工具过程与角色配置</h1><p class="lead">{esc(META['headline'])}</p>{pr}</header>
<h2>现在能不能用</h2><p class="status">{esc(META['availability'])}</p><p>基线与变更视图均来自同一分支构建的真实应用，分别关闭、启用本可选插件；原有原生视图代码未作行为修改。确切基线与变更修订以 PR 的证据说明为准。</p>
<h2>验证数字</h2><div class="kpis">{kpis}</div>{chart}<p>Web JUnit 中另有 {stats['browser']['skipped']} 项不适用项：基线未加载新增入口，因此不执行启用组专属的产物与角色交互用例。没有把跳过项计作通过。</p><table><thead><tr><th>检查</th><th>最终日志状态</th></tr></thead><tbody>{checks}</tbody></table><p>全量 GUI 回归：{stats['gui']['passed']} 通过、{stats['gui']['failed']} 失败、{stats['gui']['skipped']} 跳过；失败均为超时，涉及 binary-rpc 两种压缩配置、ReviewTab 重试及文档预览打包。对这三个文件的定向重跑为 {stats['gui_recheck']['passed']} 通过、{stats['gui_recheck']['failed']} 失败。保留全量失败记录，不宣称全套绿色；未改动这些模块。</p>
<h2>关键证据与复现入口</h2><p>以下均为真实 Harness 应用捕获，使用确定性会话记录；它们证明呈现和交互，不证明真实模型生成行为。图片内联在本文件中，可离线查看。</p>{comparisons}<h3>新增交互的实际状态</h3><div class="pair">{image('after-artifact-preview.png','After · 点击交互预览，计数器实际从 0 到 1')}{image('after-agent-profile.png','After · 读取实际预设声明，展开 YAML')}</div>{real_evidence}<pre>{esc(commands)}</pre><p>数字来源：<a href="../evidence/lobe-visualization/metrics.json">metrics.json</a>、<a href="../evidence/lobe-visualization/unit.xml">组件 JUnit</a>、<a href="../evidence/lobe-visualization/browser.xml">浏览器 JUnit</a>。回归比较的原始提交标识和报告保留在本地忽略目录，避免把不允许的提交引用写入维护文档。</p>
<h2>未验证项与下一步</h2><ul>{limitations}</ul><p>下一步由设计或产品审核并决定合入，再安装到目标 profile；此文件不声称用户当前 GUI 已经更新。</p><details><summary>六视角自检与自身盲区</summary><table><thead><tr><th>视角</th><th>可检验问题</th><th>判断</th></tr></thead><tbody>{review}</tbody></table><p>本次审查自身盲区：{esc(META['decision']['blindspots'])}</p></details><footer>生成脚本：ops/lobe-visualization/build_overview.py。可逆选择：停用本组合包恢复原生视图；接口或产品要求变化时重新评估。</footer></main></html>'''
target = ROOT / 'docs/overview/lobehub-visualization-概览.html'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(output + '\n')
print(json.dumps({'overview': str(target), 'metrics': stats}, ensure_ascii=False))
