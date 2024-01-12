# Path Tracing

该项目基于此 [项目](https://github.com/wulinjiansheng/WebGL_PathTracer/tree/master) 进行了完全重构，并新增了许多功能。

原项目实现了：

- 基于完全场景遍历的路径追踪算法
- 基本物体 Sphere、Cube、Plane 的相交测试
- 基本的漫射、反射材质，以及基于 Fresnel 方程的折射材质
- 写死的次表面散射样例

本项目新增和改进了以下方面：

- 改进：使用 ES6 模块以及 OOP 完全重构了原项目的代码，使其更易于扩展（当然还有许多可以抽象并简化的地方）
- 改进：重写了 shader 代码，使其更加简洁和清晰
- 新增：基于 BVH 的第一级加速结构，使得场景遍历的时间复杂度从 $ O(n) $ 降低到 $ O(\log n) $
- 新增：三角面对象的加载 (Wavefront .obj format) 和渲染
  - 新增：三角面的相交测试
  - 新增：基于 BVH 的第二级加速结构，使得三角面的相交测试的时间复杂度从 $ O(n) $ 降低到 $ O(\log n) $
- 新增：环境材质加载

## 运行

```bash
npm install
npx vite
```