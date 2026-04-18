# @whyun/tv-tools

TypeScript 工具库，用于解码 **TVBox** 类配置 JSON：常见加密/编码载荷解密、带注释的 JSON 预处理，以及 `TVBoxConfig` 等类型定义。

## 要求

- **Node.js** ≥ 20（使用 `node:crypto`）
- **模块**：与 [hotel-tvn](https://github.com/whyun-pages/hotel-tvn) 相同，`tsc` 双产物：`dist/cjs`（CommonJS）与 `dist/esm`（`module`/`moduleResolution`: `NodeNext`），均为 **`*.js`** + **`*.d.ts`**（含 `declarationMap`）

## 安装

从 registry 安装（包名为作用域包）：

```powershell
pnpm add @whyun/tv-tools
```

在 monorepo 或本地路径引用：

```powershell
pnpm add file:../tv-tools
# 或 workspace 协议等，按你的仓库约定
```

克隆本仓库开发时：

```powershell
pnpm install
pnpm run build
```

## 用法

```typescript
import {
  decodeTvboxJson,
  parseTvboxJson,
  type TVBoxConfig,
} from '@whyun/tv-tools';

// 解密/解码为字符串（已是合法 JSON 时原样返回）
const jsonText = decodeTvboxJson(raw, optionalConfigKey);

// 直接解析为对象（默认泛型为 TVBoxConfig）
const config = parseTvboxJson<TVBoxConfig>(raw, optionalConfigKey);
```

| API | 说明 |
|-----|------|
| `decodeTvboxJson(input, configKey?)` | 处理 Base64 前缀、特定 hex/CBC 流程；若传入 `configKey` 且内容为 hex 密文，则 AES-128-ECB 解密。 |
| `parseTvboxJson(input, configKey?)` | 在解码后解析 JSON；会先去除 `//`、`/* */` 注释与 BOM，再 `JSON.parse`。 |

类型定义在源码 `src/types.ts`（由 `tsc` 生成 `dist/*/types.js` 与 `types.d.ts`，纯类型时 JS 几乎为空）。解码逻辑在 `src/tvbox-json-decrypt.ts`。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm run build` | 清理并构建 CJS + ESM 到 `dist/` |
| `pnpm run test` | 运行 Vitest（单次） |
| `pnpm run test:watch` | Vitest 监听模式 |
| `pnpm run test:ci` | CI：测试 + 覆盖率 + JUnit |
| `pnpm run lint` | ESLint 检查 |
| `pnpm run lint:fix` | ESLint 自动修复 |

## 许可证

[MIT](LICENSE)
