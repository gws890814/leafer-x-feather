# 贡献指南

感谢你改进 `@choo/leafer-x-feather`。

## 本地开发

```bash
npm install
npm run dev
```

提交代码前运行：

```bash
npm run check
```

## 设计约束

- 使用 Leafer 的节点、画布和 Filter 扩展点，不绕过 Leafer 直接操作宿主 Canvas。
- Feather 是渲染期效果，不能改写源路径、图片、颜料或 JSON 作者数据。
- 多层羽化使用一个 Filter 的半径数组；兼容旧版多 Filter 输入，但不新增第二套结果语义。
- 图片、路径、容器、描边、渐变和阴影必须走同一条渲染路径。
- 新增行为必须补充单元测试；涉及像素结果时同时补充 Demo 浏览器回归。

## 提交内容

Issue 或 Pull Request 请至少包含：

- 可复现的 Leafer JSON 或最小代码
- 浏览器、设备像素比和 Leafer 版本
- 预期结果与实际结果
- 性能问题对应的节点尺寸、羽化半径和节点数量

不要提交业务接口、用户数据、内部域名或与 Feather 无关的编辑器代码。
