# Mock.js Completion

在 VS Code 中编辑 mock 文件时，为 Mock.js 占位符提供智能提示。在工作区根目录的 `mocks/**/*.json` 字符串值中输入 `@`，即可选择 `@cname`、`@integer` 等候选，并通过 Tab 填写参数。

这是一个**编辑器扩展**：只帮助编写模板，不生成接口文件、不执行 Mock.js，也不启动 HTTP 服务。当前通过 VSIX 安装，未发布到 VS Code Marketplace；扩展 ID 为 `mockjs-completion`。

> **还没有安装 `mock-service-plugin`？** 不影响本扩展的补全功能。但如果希望前端请求获得 mock 响应，需要在业务项目中另外安装并启动该服务。扩展不会检测、安装或启动它，具体步骤见下方「联合使用指南」。

## 工具如何配合

| 工具                             | 安装位置 / 方式                | 职责                                                                                                                                 |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| an-cli（npm 包名 **`anl`**）     | 业务项目的开发依赖，或全局安装 | `anl type` 根据 Swagger / OpenAPI JSON 生成 TypeScript 类型、接口列表和请求函数；`anl mock` 根据已生成的接口与响应类型生成 mock 模板 |
| `mock-service-plugin`            | 业务项目的 npm 开发依赖        | 递归扫描配置的 mock 目录，匹配请求路径和方法，使用 Mock.js 生成数据并返回 HTTP 响应                                                  |
| **Mock.js Completion（本扩展）** | VS Code 中安装 VSIX            | 用户自主编辑 mock 模板时，提供 Mock.js 占位符及参数模板补全                                                                          |

```text
Swagger / OpenAPI JSON
  -> anl type：生成 TypeScript 类型、接口列表和请求函数
  -> anl mock：生成 mocks/<服务>/<接口>.json 模板
  -> VS Code + 本扩展：人工调整字段、占位符和参数
  -> mock-service-plugin：读取模板，匹配请求并生成数据
  -> 前端通过 mock 服务或开发代理获得 HTTP 响应
```

三者不是互相自动调用的工具：`anl mock` 不会启动服务，安装扩展不会安装 CLI 或服务包，启动服务也不会为 VS Code 注册补全。

- **只想编辑已有模板**：安装本扩展即可，不要求安装另外两个工具。
- **想手写模板并提供接口响应**：使用本扩展 + `mock-service-plugin`，无需 Swagger 或 `anl`。
- **想从接口文档生成模板再调试前端**：按联合指南使用全部工具。

## 安装扩展

要求 VS Code **1.85.0 或更高版本**。获得 `mockjs-completion-0.0.1.vsix` 后，在 VS Code 扩展面板的菜单中选择「从 VSIX 安装」，选择该文件。

也可以在 VSIX 所在目录执行：

```sh
code --install-extension mockjs-completion-0.0.1.vsix --force
```

若没有 VSIX，可按下方「从源码打包」生成。安装后若当前窗口未加载扩展，执行命令面板中的「Developer: Reload Window」。这不会修改业务项目的 npm 依赖。

旧版用户注意：旧 ID `local-tools.mockjs-workspace-completion` 不会被新 ID 自动覆盖，请先卸载旧扩展，避免重复候选。没有安装过旧版则跳过：

```sh
code --uninstall-extension local-tools.mockjs-workspace-completion
```

macOS 若找不到 `code`，可通过命令面板执行「Shell Command: Install 'code' command in PATH」，或直接使用扩展面板安装、使用「打开文件夹」打开项目。

## 使用补全

### 1. 打开业务项目根目录

以下 `my-app` 均为示例项目名。进入自己的业务项目根目录后执行：

```sh
code .
```

目录应类似：

```text
my-app/
├── mocks/
│   ├── user.json
│   └── demo/
│       └── detail.json
├── src/
└── package.json
```

扩展仅检查**文件所属工作区文件夹根目录**下的 `mocks/**/*.json`。多根工作区按所属文件夹分别判断。打开 `my-app` 的上级目录、只打开 `mocks/` 本身，或只打开单个文件而没有工作区，都不会生效。

不需要把扩展源码放到业务项目的 `.vscode/` 或 `mocks/` 中。

### 2. 编辑字符串中的占位符

新建 `mocks/user.json`，或打开 `anl mock` 生成的 `.json` 模板。以下示例可以与服务配合使用：顶部注解声明路由，正文保持严格 JSON。

<!-- prettier-ignore -->
```jsonc
/**
 * 用户信息
 * @url /api/user/info
 * @method GET
 */
{
  "code": 200,
  "data": {
    "id": "@guid",
    "name": "@cname",
    "age": "@integer(18, 60)",
    "email": "@email",
    "content": "@cparagraph(3, 7)",
    "locale": "@pick(['zh-CN', 'zh-HK'])"
  }
}
```

1. 将文件的语言模式切换为 **JSON with Comments（JSONC）**，以支持顶部路由注解；文件扩展名仍保留 `.json`。
2. 在字符串值中输入 `@`，例如将 `name` 的值改为 `"@"`，光标停在 `@` 后、闭合引号前，显示当前内置的 51 个候选。
3. 继续输入名称，例如 `@cn`，由 VS Code 筛选候选；确认后插入占位符。
4. 对 `@integer` 等带参数的候选，用 Tab 切换参数位置，按业务需要修改并保存。

补全会替换光标附近已有的 `@` 和函数名称，避免出现 `@@cname`；也支持数组字符串及 `"hello @cname"` 这样的文本。字符串参数默认使用单引号，避免破坏外层 JSON 双引号。

### 生效条件与限制

| 条件                                               | 当前行为                                   |
| -------------------------------------------------- | ------------------------------------------ |
| 工作区根目录下 `mocks/user.json` 或其子目录文件    | 支持                                       |
| 文件语言模式为 JSON 或 JSON with Comments（JSONC） | 支持                                       |
| 字符串值、数组中的字符串                           | 支持                                       |
| 属性名、注释、非字符串值                           | 不提供补全                                 |
| `mocks/user.jsonc`、JS、TS 等其他扩展名            | 不支持，JSONC 语言模式不等于 `.jsonc` 文件 |
| `src/mocks/`、其他目录、未归属工作区的文件         | 不支持                                     |
| 非 `file` URI 文档、未保存的新文件                 | 不支持                                     |

本扩展不补全 `@url`、`@method` 等服务注解，也不补全属性名中的 Mock.js 规则（如 `"list\u007c1-10"`）。它只插入内置候选，不校验参数或执行模板，不读取业务自定义的 `Mock.Random.extend`。

**JSONC 支持仅指编辑器补全。** 服务提取顶部路由注解后，JSON 响应正文仍需通过 `JSON.parse`：不要在正文加入注释或尾随逗号。`@dataImage` 还需要运行环境支持 Canvas，补全成功不代表服务具备该运行能力。

## 联合使用指南

以下命令均在**业务项目根目录**执行，而不是本扩展源码目录。推荐使用 Node.js 22 或更新受支持的 LTS 版本；安装依赖和获取远程 Swagger 文档需要网络。示例使用 npm，已有 pnpm / Yarn 项目应沿用原包管理器，不要混用锁文件。

### 1. 安装 CLI 与服务依赖

如果项目尚未安装这两个包：

```sh
npm install -D anl mock-service-plugin
```

pnpm 或 Yarn 项目任选对应命令：

```sh
pnpm add -D anl mock-service-plugin
yarn add -D anl mock-service-plugin
```

注意 npm 包名是 **`anl`，不是 `an-cli`**。这两个包都已发布到 npm，无需下载各自的源码工程。

只需要手写模板并启动服务时，执行 `npm install -D mock-service-plugin`，添加下方的 `mock:server` 脚本后跳到第 4 步，无需添加两个生成脚本。只生成模板而不提供 HTTP 响应时，可以只安装 `anl`。服务包已包含 `mockjs` 运行依赖，除非业务代码直接导入它，否则不必另行安装。

将以下脚本**合并**到业务项目现有的 `package.json` 的 `scripts` 中，保留其他脚本：

```json
{
  "scripts": {
    "api:generate": "anl type",
    "mock:generate": "anl mock",
    "mock:server": "node scripts/mock-server.mjs"
  }
}
```

后续使用 `npm run` 调用项目内的 CLI，不要求全局安装。第 5 步创建启动脚本后，才能运行 `mock:server`。已有 mock 启动命令的项目可沿用原配置，不必重复添加服务。

### 2. 从 Swagger 生成类型和接口列表

```sh
npm run api:generate
```

首次没有配置时，`anl type` 会初始化根目录的 `an.config.ts`。先修改其中的 `swaggerConfig`，填写项目真实的 Swagger / OpenAPI JSON 地址，以及必要的请求头；确认类型和 API 输出目录后，再执行一次生成命令。

也支持 `an.config.json`，两者同时存在时 **TypeScript 配置优先**。以下为 JSON 配置示意；已有配置时只调整对应字段，不要另建一个被忽略的 JSON 文件，也不要覆盖原有服务配置：

```json
{
  "saveTypeFolderPath": "src/types",
  "saveApiListFolderPath": "src/apis",
  "saveEnumFolderPath": "src/enums",
  "requestMethodsImportPath": "./config/fetch",
  "requestTemplate": "fetch",
  "swaggerConfig": [
    {
      "name": "demo",
      "url": "https://api.example.com/openapi.json",
      "apiListFileName": "demo.ts",
      "dataLevel": "serve"
    }
  ],
  "mock": {
    "mockDir": "mocks"
  }
}
```

`api.example.com` 是占位地址，必须替换成真实的 **JSON 文档地址**，不是 Swagger UI 页面。请求模板应按项目技术栈选择；已有项目保留原来的请求封装及配置。全部配置项见 [anl type 文档](https://bianliuzhu.github.io/an-cli/#/zh-cn/anl-type)。

### 3. 从本地接口信息生成 mock 文件

类型及接口列表成功生成后执行：

```sh
npm run mock:generate
```

`anl mock` 读取已生成的接口列表和 TypeScript 响应类型，选择服务后生成模板；只有一个服务时直接生成。它不会再次访问 Swagger、执行业务请求或启动服务器。

也可以指定服务或生成全部服务：

```sh
npm run mock:generate -- -S demo
npm run mock:generate -- --all
```

将 `demo` 替换成实际服务名或 API 文件名去掉扩展名。默认输出为 `mocks/<服务文件名去扩展名>/<接口函数名>.json`，并包含服务需要的 `@url`、`@method` 顶部注解。

**默认保留已有 mock，不会用新生成结果覆盖手工调整。** 只有确认要重新生成已有内容时才加 `--overwrite`，执行前应保存或提交需要保留的修改。类型信息不完整时，生成器可能留下 `null`、`{}` 或警告，需要人工补齐，详见 [anl mock 文档](https://bianliuzhu.github.io/an-cli/#/zh-cn/anl-mock)。

### 4. 用本扩展完善模板

在 VS Code 中打开生成的文件，按「使用补全」中的方法编辑 `@` 占位符，调整姓名、邮箱、数值范围、枚举等字段，并核对业务成功码和响应结构。

没有 Swagger 或不使用 CLI 时，也可以直接创建上面的 `mocks/user.json` 示例。服务既能读取生成文件，也能读取手写文件。

**三处目录必须对齐：** 生成器的 `mock.mockDir`（或 `--mock-dir`）、服务的 `mockDir`，以及本扩展固定支持的工作区根目录 `mocks/`。建议统一使用 `mocks`。

生成器和服务可以使用其他目录，但本扩展不读取它们的配置，没有自定义目录设置；改成 `fixtures/` 或 `src/mocks/` 后，即使服务能响应，扩展也不会补全。服务支持的文件格式也不局限于本扩展支持的 `.json`。

### 5. 启动 mock HTTP 服务

如果项目没有接入服务，在业务项目中新建 `scripts/mock-server.mjs`：

```mjs
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer } from "mock-service-plugin";

const mockDir = fileURLToPath(new URL("../mocks/", import.meta.url));
mkdirSync(mockDir, { recursive: true });

startServer({ mockDir, port: 3008 });
```

`.mjs` 可直接使用 ESM，无需修改业务项目的 `type` 配置或安装 TypeScript 执行器。服务会递归读取 `mocks`，因此不需要逐个注册服务子目录。

```sh
npm run mock:server
```

保持该终端运行，在另一个终端验证。若创建了上面的 `mocks/user.json`，执行：

```sh
curl http://localhost:3008/api/user/info
```

预期得到 `code`、`data` 等字段，`name`、`age` 等占位符已替换为生成的数据。若使用 CLI 生成的文件，请按该文件的 `@url` 和 `@method` 请求；路径不是由文件名决定的，动态路由参数应替换为实际值。

`3008` 被占用时改用空闲端口，并同步修改前端代理。已有启动命令或构建工具集成会调用 `startServer` 时，继续使用原方式，不要再同时启动第二个服务。mock 服务仅用于开发，不应接入生产启动流程或暴露到公网。

### 6. 让前端请求到达 mock 服务

**安装依赖、生成文件和启动服务都不会自动修改前端请求地址。** 前端开发服务需要另外启动，并将目标接口请求转发到 mock 服务。

以 Vite 为例，在已有配置中合并以下开发代理，保留原来的插件和其他配置：

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3008",
        changeOrigin: true,
      },
    },
  },
});
```

前端请求 `/api/user/info` 时，由开发服务器转发到 mock 服务。请求客户端应使用相对地址或指向开发服务器的 baseURL；若仍直接请求真实后端域名，就不会经过该代理。代理前缀按实际 `@url` 调整，并保留匹配所需的完整路径，不要随意去掉 `/api`。

其他框架按各自开发代理配置接入即可，不要求使用 Vite。生产环境应恢复真实接口配置。

后续接口变化时，按需重新执行 `api:generate` 和 `mock:generate`，检查已有模板是否需要手工同步，再用扩展补全并验证请求。前两步负责生成，扩展负责编辑，服务负责运行，互不替代。

## 扩展开发与打包

### 环境要求

- 使用扩展：VS Code 1.85.0 或更高版本。
- 开发和打包：建议 Node.js 22 LTS 或更新受支持的 LTS 版本，以及 npm；打包工具以其自身的 Node.js 要求为准。
- 首次安装依赖和通过 `npx` 获取打包工具需要网络。安装完成的扩展不需要联网获取候选。

### 从源码打包

在**本项目根目录**执行，而不是业务项目目录：

```sh
npm ci --ignore-scripts
npm test
npx --yes @vscode/vsce package --allow-missing-repository --skip-license --no-rewrite-relative-links
```

当前版本生成 `mockjs-completion-0.0.1.vsix`。修改版本号后，安装命令中的文件名也要相应更新。无需单独编译，扩展直接运行 CommonJS 源码。

上述打包选项用于当前未配置仓库地址、许可证为 `UNLICENSED` 的本地工具，不代表已具备公开发布条件。`--no-rewrite-relative-links` 保留本文的源码相对链接，避免打包工具在没有仓库地址时重写失败；这些链接供源码目录内阅读使用，不保证在已安装扩展的详情页中可跳转。公开发布时应配置真实仓库地址并恢复链接重写。

重新打包后，按「安装扩展」中的步骤安装新 VSIX 并重载窗口。原有业务模板无需迁移，旧名称 VSIX 不应继续用于安装。`local-tools` 是本地 publisher 标识，未验证 Marketplace 名称可用性。

## 目录与实现

```text
mockjs-completion/
├── src/
│   └── extension.cjs         # 扩展入口、作用域判断与补全逻辑
├── snippets/
│   └── mockjs.code-snippets  # 唯一候选数据源，JSONC 格式
├── test/
│   └── extension.test.cjs    # Node.js 内置测试，模拟 VS Code API
├── package.json             # 扩展清单、运行入口、依赖与脚本
├── package-lock.json        # 锁定 npm 依赖，供 npm ci 使用
├── .gitignore               # 忽略依赖和 VSIX 产物
├── .vscodeignore            # 排除不需要打入 VSIX 的文件
└── README.md
```

`node_modules/` 和 `*.vsix` 是本地产物，不属于源码目录规划。当前规模无需额外引入构建系统、`dist/` 或拆出多层模块。

- [src/extension.cjs](src/extension.cjs)：注册 JSON / JSONC 的 `@` 触发补全；结合工作区相对路径和 JSON 语法位置，只在目标字符串值内生成候选。
- [snippets/mockjs.code-snippets](snippets/mockjs.code-snippets)：集中维护前缀、插入模板、中文说明及 Tab 参数占位。它由扩展读取，不通过 `contributes.snippets` 注册成全局 snippets。
- [test/extension.test.cjs](test/extension.test.cjs)：从清单中的 `main` 加载扩展，以便目录调整后也能检查实际入口和资源路径。

使用 Completion Provider 是为了让单独输入 `@` 就能触发候选。仅靠 snippets 不能可靠满足这一行为，因为 JSON 默认单词规则不把 `@` 当作普通单词字符。运行时唯一 npm 依赖是 `jsonc-parser`，用于解析候选文件和判断正在编辑的 JSON 位置；不依赖 `mockjs` 或 `mock-service-plugin`。

## 维护与验证

修改候选时，编辑 [snippets/mockjs.code-snippets](snippets/mockjs.code-snippets) 中的 `prefix`、`body`、`description`；`body` 使用 VS Code snippet 语法，例如 `${1:18}`。该文件允许注释和尾随逗号，读取时应保留 `jsonc-parser`，不要改为 `JSON.parse`。

增加或删除候选时，同步更新测试中的数量断言和本文的候选数量。调整文件范围或补全规则时，同时更新测试及本文的生效条件。

```sh
npm test
```

现有单元测试覆盖裸 `@`、标识符替换范围、数组和文本内占位符、根目录与嵌套模板、无工作区文件，以及不应生效的位置和扩展名。测试模拟了 VS Code API，不能替代真实编辑器中的交互验证。

发布本地新版本前，重新打包并安装，在业务工作区手工验证：输入 `@`、继续输入筛选、确认候选、Tab 切换参数，以及普通 JSON 文件不出现这些候选。VSIX 应包含源码、候选文件及运行依赖，不包含测试文件和旧 VSIX。

## 常见问题

| 现象                                     | 检查项                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 输入 `@` 没有候选                        | 扩展是否启用；文件是否位于所属工作区根目录的 `mocks/`；后缀是否为 `.json`；语言模式是否为 JSON / JSONC；光标是否在字符串值内 |
| 手动触发有候选，输入 `@` 不自动弹出      | 检查 `editor.suggestOnTriggerCharacters` 是否开启，默认开启                                                                  |
| 候选被隐藏                               | 检查是否设置了 `editor.suggest.showSnippets: false` 或 `editor.snippetSuggestions: "none"`                                   |
| 顶部注解被编辑器标红                     | 将该 `.json` 文件的语言模式切换为 JSON with Comments；这不会改变服务对正文的解析规则                                         |
| 已装扩展，但还没有 `mock-service-plugin` | 只编辑模板无需安装；需要 HTTP 响应时，在业务项目执行 `npm install -D mock-service-plugin` 并按联合指南启动服务               |
| 找不到 `anl` 命令                        | npm 包名是 `anl`；项目内安装后通过上述 `npm run` 脚本执行，无需依赖全局命令                                                  |
| `anl mock` 找不到服务或类型              | 先配置并成功运行 `anl type`，确认 API 和类型输出目录与当前配置一致                                                           |
| 生成了文件，但前端请求仍走真实后端       | 检查 mock 服务是否启动，以及前端 baseURL、开发代理、端口、请求方法和模板 `@url` 是否一致                                     |
| 服务能读文件，扩展却不补全               | 检查服务目录是否与扩展固定的工作区 `mocks/` 约定一致                                                                         |
| 补全成功但接口报错                       | 检查服务日志、正文 JSON 格式、占位符参数与运行环境；扩展不验证服务执行结果                                                   |
| 出现重复候选                             | 禁用或卸载旧名称扩展，并检查是否另外注册了全局 Mock.js snippets                                                              |

## 参考

- [anl（npm）](https://www.npmjs.com/package/anl)
- [anl 安装说明](https://bianliuzhu.github.io/an-cli/#/zh-cn/install)
- [anl type：生成类型与接口](https://bianliuzhu.github.io/an-cli/#/zh-cn/anl-type)
- [anl mock：生成 mock 模板](https://bianliuzhu.github.io/an-cli/#/zh-cn/anl-mock)
- [mock-service-plugin（npm）](https://www.npmjs.com/package/mock-service-plugin)
- [Mock.Random 文档](https://github.com/nuysoft/Mock/wiki/Mock.Random)
- [mock-service-plugin](https://github.com/bianliuzhu/mock-service-plugin)
- [VS Code 补全 API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#show-code-completion-proposals)
