# 自我介绍网站（Flask + SQLite）

这是一个可运行的个人网站项目：
- 前端：`index.html + styles.css + script.js`
- 后端：`Flask (app.py)`
- 数据库：`SQLite (self_intro.db)`

## 1. 安装依赖

在 `self-intro-site` 目录执行：

```bash
pip install -r requirements.txt
```

## 2. 初始化数据库

```bash
python init_db.py
```

执行后会生成：`self_intro.db`

## 3. 启动网站

```bash
python app.py
```

浏览器访问：

`http://127.0.0.1:5000`

## 4. 前台与后台地址

- 前台：`http://127.0.0.1:5000/`
- 后台：`http://127.0.0.1:5000/admin`
  - 若操作失败，页面顶部会显示详细错误（状态码/接口/返回内容）

## 5. 数据接口

### 前台
- `GET /api/site-data`
  - 返回个人资料、技能、项目、经历
- `POST /api/messages`
  - 提交留言并写入 `messages` 表
  - JSON body:

```json
{
  "name": "你的名字",
  "email": "you@example.com",
  "message": "你好"
}
```

### 后台管理 API（admin 页面已调用）

- `GET /api/admin/data`：获取后台初始化数据
- `PUT /api/admin/profile`：更新个人资料
- `POST /api/admin/skills`：新增技能
- `DELETE /api/admin/skills/<id>`：删除技能
- `POST /api/admin/projects`：新增项目
- `DELETE /api/admin/projects/<id>`：删除项目
- `POST /api/admin/experiences`：新增经历
- `DELETE /api/admin/experiences/<id>`：删除经历

## 6. 你可以改哪里

- `database.sql`
  - 修改默认填充数据
- `index.html`
  - 调整页面结构
- `styles.css`
  - 调整视觉主题
- `script.js`
  - 调整前台渲染逻辑
- `admin.html + admin.js`
  - 调整后台表单与交互
- `app.py`
  - 扩展 API（如后台登录、权限控制等）
