PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS experiences;
DROP TABLE IF EXISTS profile;

CREATE TABLE profile (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  english_name TEXT,
  title TEXT NOT NULL,
  city TEXT,
  direction TEXT,
  status TEXT,
  bio TEXT,
  email TEXT,
  wechat TEXT,
  phone TEXT,
  github_url TEXT,
  linkedin_url TEXT
);

CREATE TABLE skills (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('熟练', '了解', '正在学习')),
  skill_name TEXT NOT NULL,
  level INTEGER CHECK (level >= 0 AND level <= 100)
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  project_type TEXT,
  summary TEXT,
  contribution TEXT,
  tech_stack TEXT,
  result_text TEXT,
  preview_url TEXT,
  source_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE experiences (
  id INTEGER PRIMARY KEY,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  period TEXT NOT NULL,
  summary TEXT,
  achievement_1 TEXT,
  achievement_2 TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

INSERT INTO profile (
  id, name, english_name, title, city, direction, status, bio, email, wechat, phone, github_url, linkedin_url
) VALUES (
  1,
  '林墨',
  'Mo Lin',
  '前端开发工程师 / 全栈开发者',
  '上海',
  '前端工程、数据产品、全栈落地',
  '积极寻找前端岗位',
  '专注 Web 开发与数据产品落地，擅长把复杂需求拆解为可交付功能，并持续优化性能与用户体验。',
  'molin.dev@example.com',
  'molin_dev',
  '(+86) 139-1111-2222',
  'https://github.com/molin-dev',
  'https://www.linkedin.com/in/molin-dev/'
);

INSERT INTO skills (category, skill_name, level) VALUES
('熟练', 'HTML/CSS', 92),
('熟练', 'JavaScript', 90),
('熟练', 'TypeScript', 86),
('熟练', 'React', 88),
('熟练', 'Next.js', 82),
('了解', 'Node.js', 80),
('了解', 'Express', 75),
('了解', 'MySQL', 72),
('了解', 'Docker', 70),
('正在学习', '性能优化', 78),
('正在学习', '工程化体系', 74),
('正在学习', '系统设计', 66);

INSERT INTO projects (
  title, project_type, summary, contribution, tech_stack, result_text, preview_url, source_url, sort_order
) VALUES
(
  '课程学习平台重构',
  '团队项目',
  '重构老旧学习平台，统一课程页与练习页交互体验。',
  '搭建组件库、拆分业务模块、推动灰度上线。',
  'React, TypeScript, Zustand, Vite',
  '首屏时间下降 32%，样式类线上问题下降 45%。',
  'https://example.com/learn',
  'https://github.com/molin-dev/learn-platform',
  1
),
(
  '运营数据看板系统',
  '持续迭代',
  '构建招生、活跃、转化全链路看板，支持按周追踪。',
  '指标建模、接口联调、图表组件封装。',
  'TypeScript, ECharts, Node.js, MySQL',
  '周报制作时长从 2 小时降低到 20 分钟。',
  'https://example.com/dashboard-doc',
  'https://github.com/molin-dev/op-dashboard',
  2
),
(
  '面试题练习社区',
  '开源项目',
  '实现题库浏览、收藏、评论与搜索功能。',
  '鉴权设计、全文检索、Docker 部署、CI 流程。',
  'Next.js, PostgreSQL, Docker, GitHub Actions',
  '开源仓库累计 1.2k Star，月活持续增长。',
  'https://example.com/interview-community',
  'https://github.com/molin-dev/interview-community',
  3
);

INSERT INTO experiences (
  organization, role, period, summary, achievement_1, achievement_2, sort_order
) VALUES
(
  '星火教育科技',
  '前端开发工程师',
  '2024.07 – 至今',
  '负责学习平台核心页面与数据看板开发。',
  '主导组件库升级，统一 40+ 页面交互规范。',
  '推动性能治理，核心页面 LCP 提升 28%。',
  1
),
(
  '华东理工大学',
  '软件工程（本科）',
  '2020 – 2024',
  '主修软件工程与数据系统方向。',
  '智慧教学后台系统获院级优秀毕业设计。',
  '获得国家励志奖学金与校赛二等奖。',
  2
);

INSERT INTO messages (visitor_name, visitor_email, message) VALUES
('王同学', 'wang@example.com', '你好，我对你的项目很感兴趣，方便交流吗？'),
('李老师', 'li@example.com', '作品结构清晰，建议补充更多性能优化细节。');
