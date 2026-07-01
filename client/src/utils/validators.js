// 表单验证规则
export const robotRules = {
  type: [
    { required: true, message: '请选择机器人类型', trigger: 'change' },
  ],
  serial: [
    { required: true, message: '请输入序列号', trigger: 'blur' },
    { min: 2, max: 50, message: '序列号长度 2-50 个字符', trigger: 'blur' },
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' },
  ],
  ip: [
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP 地址格式不正确', trigger: 'blur' },
  ],
}

export const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
}
