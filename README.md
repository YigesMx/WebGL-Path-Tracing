# Path Tracing

该项目参考了 [项目](https://github.com/wulinjiansheng/WebGL_PathTracer/tree/master) ，并对代码进行了完全重写和重构，在此基础上加入了更复杂的功能。

其中原项目实现了：

- 基于完全场景遍历的路径追踪算法。
- 基本物体 Sphere、Cube、Plane 的相交测试。
- 基本的漫射、反射、折射材质。

本项目（本次大作业）新增和改进了以下方面：

- 修复：球体的相交测试中，对法线的 Model 矩阵变换修正。
- 修复：SSAA 采样算法修正。
- 修复：折射 IOR 计算修正。

- 改进：使用 ES6 模块以及 OOP 完全重构了原项目的逻辑代码，使其更易于扩展（当然还有许多可以抽象并简化的地方，其中有大量因需要与 WebGL 混编而作出的妥协）。
  - 新增：渲染器类（class Renderer）、视角类（class ViewConfig）、交互类（class Interactions）的抽象与数据存储。
  - 新增：场景类（class Scene）的抽象与数据存储。
- 改进：重写了 Shader 代码，使其更加清晰。
  - 新增：各材质的数据提取与访问方法。
  - 改进：求交代码逻辑与路径追踪材质应用逻辑。
- 改进：材质与物体的分离，使得材质可以被多个物体共享。
  - 新增：物体类（class Obj）、材质类（class Material）的抽象与数据存储。
  - 新增：逻辑代码中对材质和物体的抽象与数据存储。
- 改进：重写 GUI 模块，并增加一些功能，使其更加清晰易用。

- 新增：BVH 加速数据结构的构建与 Shader 遍历。
  - 新增：基于 BVH 的第一级加速结构，使得场景遍历（相交测试）的时间复杂度从 $ O(n) $ 降低到 $ O(\log n) $。
  - 新增：基于 BVH 的第二级加速结构，使得三角面的相交测试的时间复杂度从 $ O(n) $ 降低到 $ O(\log n) $。
  - 新增：用于统一管理两级 BVH 结构数据的类（class BVHs）。
  - 新增：AABB 包围盒类（class AABB）。
  - 效果：（在 MacBook Pro 14' M2 Pro 上）
    - 无三角面物体（删除第二级 BVH 相关代码）：120+fps
    - 无三角面物体（场景共 0 个面）：70fps
    - 有三角面物体（场景共 4000 个面，若无 BVH 结构已无法正常渲染）：40fps
    - 有三角面物体（场景共 9.1 万个面）：20fps
- 新增：三角面物体的加载 (Wavefront .obj format，基于 obj-file-parser) 和渲染（基于以上 BVH 加速结构）。
  - 新增：三角面物体相关类（class MeshModels、class Mesh、class TriangleArray、class Triangle）的加载、存储和 Shader 访问。
  - 新增：Shader 中三角面的相交测试。
- 新增：环境材质加载

已发现的问题和待改进的地方：

- 问题：当前项目仅在 MacBook Pro 14' M2 Pro 上测试过，Chromium 内核浏览器和 Safari 均可正常运行，其他设备上可能存在兼容性问题。
  - （已知 Windows Chromium 无法正常执行二级 BVH 部分，会导致浏览器崩溃，若将 Shader 中判断 tempObj.objType == 3 部分删除，即放弃掉三角面物体的渲染可正常运行，目前不清楚原因所在，欢迎感兴趣的朋友pr）
- 待改进：对次表面反射的物理实现。

## 运行

```bash
npm install
npx vite
```