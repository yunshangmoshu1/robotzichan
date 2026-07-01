-- ROBO::TRACK 2.0 完整建表脚本
-- 在 Supabase SQL Editor 中执行

-- 0. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. robots 表（资产主表，含 2.0 新增字段）
-- =============================================
CREATE TABLE IF NOT EXISTS robots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                              -- 机器人类型
  serial TEXT NOT NULL,                            -- 出厂编号
  barcode TEXT,                                    -- 条形码（2.0新增）
  status TEXT NOT NULL DEFAULT '测试中',            -- 状态
  person TEXT,                                     -- 关联责任人
  ip TEXT,                                         -- IP 地址
  location TEXT,                                   -- 当前位置
  department TEXT,                                 -- 部门（2.0新增）
  notes TEXT,                                      -- 备注/历史记录
  borrowed BOOLEAN DEFAULT FALSE,                  -- 是否借出
  borrowed_to TEXT,                                -- 借用人
  borrowed_at TIMESTAMPTZ,                         -- 借出时间
  return_due TIMESTAMPTZ,                          -- 预计归还时间
  image TEXT,                                      -- 相关图片
  purchase_date DATE,                              -- 采购日期（2.0新增）
  warranty_until DATE,                             -- 保修到期（2.0新增）
  value NUMERIC,                                   -- 资产价值（2.0新增）
  updater TEXT,                                    -- 最后更新人
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, serial)
);

CREATE INDEX IF NOT EXISTS idx_robots_serial ON robots(serial);
CREATE INDEX IF NOT EXISTS idx_robots_type ON robots(type);
CREATE INDEX IF NOT EXISTS idx_robots_status ON robots(status);
CREATE INDEX IF NOT EXISTS idx_robots_location ON robots(location);
CREATE UNIQUE INDEX IF NOT EXISTS idx_robots_barcode ON robots(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_robots_department ON robots(department);

-- RLS 策略
ALTER TABLE robots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON robots FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON robots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON robots FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON robots FOR DELETE USING (true);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON robots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. change_log 表（变更记录）
-- =============================================
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_robot ON change_log(robot_id);
CREATE INDEX IF NOT EXISTS idx_changelog_time ON change_log(changed_at);

ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON change_log FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON change_log FOR INSERT WITH CHECK (true);

-- =============================================
-- 3. inventory_checks 表（盘点记录）
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  checked_by TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  UNIQUE(robot_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_robot ON inventory_checks(robot_id);
CREATE INDEX IF NOT EXISTS idx_inv_session ON inventory_checks(session_id);

ALTER TABLE inventory_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON inventory_checks FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON inventory_checks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON inventory_checks FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON inventory_checks FOR DELETE USING (true);

-- =============================================
-- 4. users 表（用户表，2.0新增）
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON users FOR UPDATE USING (true);

-- =============================================
-- 5. dingtalk_sync_logs 表（钉钉同步日志，2.0新增）
-- =============================================
CREATE TABLE IF NOT EXISTS dingtalk_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL,
  file_name TEXT,
  record_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  synced_by TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dingtalk_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON dingtalk_sync_logs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON dingtalk_sync_logs FOR INSERT WITH CHECK (true);
