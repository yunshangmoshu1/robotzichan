const supabase = require('../services/supabase');

// 获取资产列表（支持搜索/筛选/排序/分页）
exports.list = async (req, res) => {
  try {
    const {
      search, status, type, location, person, department,
      sort_by = 'updated_at', sort_order = 'desc',
      page = 1, page_size = 50,
    } = req.query;

    let query = supabase.from('robots').select('*', { count: 'exact' });

    // 搜索：在多个字段模糊匹配
    if (search) {
      query = query.or(
        `type.ilike.%${search}%,serial.ilike.%${search}%,person.ilike.%${search}%,location.ilike.%${search}%,notes.ilike.%${search}%,ip.ilike.%${search}%,barcode.ilike.%${search}%`
      );
    }

    // 筛选
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (location) query = query.ilike('location', `%${location}%`);
    if (person) query = query.ilike('person', `%${person}%`);
    if (department) query = query.eq('department', department);

    // 排序
    const ascending = sort_order === 'asc';
    query = query.order(sort_by, { ascending });

    // 分页
    const from = (parseInt(page) - 1) * parseInt(page_size);
    const to = from + parseInt(page_size) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data,
      total: count,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(count / parseInt(page_size)),
    });
  } catch (err) {
    res.status(500).json({ error: '获取资产列表失败: ' + err.message });
  }
};

// 获取单个资产详情
exports.getById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('robots')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: '资产不存在' });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '获取资产详情失败: ' + err.message });
  }
};

// 通过条形码查询资产
exports.getByBarcode = async (req, res) => {
  try {
    const { code } = req.params;

    // 优先精确匹配 barcode 字段
    let { data, error } = await supabase
      .from('robots')
      .select('*')
      .eq('barcode', code);

    if (error) throw error;

    // 如果没有精确匹配，在 serial 字段模糊匹配
    if (!data || data.length === 0) {
      const result = await supabase
        .from('robots')
        .select('*')
        .ilike('serial', `%${code}%`);
      data = result.data;
      error = result.error;
      if (error) throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: '未找到匹配的资产', code });
    }

    res.json({ data, match_count: data.length });
  } catch (err) {
    res.status(500).json({ error: '条形码查询失败: ' + err.message });
  }
};

// 新增资产
exports.create = async (req, res) => {
  try {
    const robot = req.body;

    // 检查重复（type + serial 唯一）
    if (robot.type && robot.serial) {
      const { data: existing } = await supabase
        .from('robots')
        .select('id')
        .eq('type', robot.type)
        .eq('serial', robot.serial)
        .single();

      if (existing) {
        return res.status(409).json({ error: `资产 ${robot.type} - ${robot.serial} 已存在` });
      }
    }

    const { data, error } = await supabase
      .from('robots')
      .insert(robot)
      .select()
      .single();

    if (error) throw error;

    // 记录变更日志
    await logChange(data.id, '创建', null, '新资产', req.user.display_name);

    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: '新增资产失败: ' + err.message });
  }
};

// 更新资产
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 获取旧数据用于变更日志
    const { data: old } = await supabase
      .from('robots')
      .select('*')
      .eq('id', id)
      .single();

    if (!old) return res.status(404).json({ error: '资产不存在' });

    updates.updater = req.user.display_name;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('robots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 记录变更日志（比较差异）
    const changes = [];
    for (const key of Object.keys(updates)) {
      if (['updater', 'updated_at'].includes(key)) continue;
      if (String(old[key] || '') !== String(updates[key] || '')) {
        changes.push({
          robot_id: id,
          field: fieldLabel(key),
          old_value: String(old[key] || ''),
          new_value: String(updates[key] || ''),
          changed_by: req.user.display_name,
        });
      }
    }

    if (changes.length > 0) {
      await supabase.from('change_log').insert(changes);
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '更新资产失败: ' + err.message });
  }
};

// 上传图片
exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: '请选择图片文件' });

    const fileName = `robots/${id}_${Date.now()}.jpg`;

    // 尝试上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    let imageUrl;
    if (uploadError) {
      // Storage 不可用，返回 base64
      imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    // 更新数据库
    const { data, error } = await supabase
      .from('robots')
      .update({ image: imageUrl, updater: req.user.display_name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 记录变更日志
    await supabase.from('change_log').insert({
      robot_id: id,
      field: '图片',
      old_value: '无',
      new_value: '已上传',
      changed_by: req.user.display_name,
    });

    res.json({ url: imageUrl, data });
  } catch (err) {
    res.status(500).json({ error: '图片上传失败: ' + err.message });
  }
};

// 批量导入
exports.batchImport = async (req, res) => {
  try {
    const { robots } = req.body;
    if (!robots || !robots.length) {
      return res.status(400).json({ error: '没有要导入的数据' });
    }

    // 添加更新者信息
    const robotsWithMeta = robots.map(r => ({
      ...r,
      updater: req.user?.display_name || '批量导入',
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('robots')
      .upsert(robotsWithMeta, { onConflict: 'type,serial' })
      .select();

    if (error) throw error;

    // 记录变更日志
    if (data && data.length > 0) {
      const logs = data.map(r => ({
        robot_id: r.id,
        field: '批量导入',
        old_value: '',
        new_value: `导入/更新 ${r.type} ${r.serial}`,
        changed_by: req.user?.display_name || '批量导入',
      }));
      const { error: logError } = await supabase.from('change_log').insert(logs);
      if (logError) {
        console.warn('批量导入变更日志写入失败:', logError.message);
      }
    }

    res.json({ data, imported: data.length });
  } catch (err) {
    res.status(500).json({ error: '批量导入失败: ' + err.message });
  }
};

// 删除资产
exports.remove = async (req, res) => {
  try {
    const { error } = await supabase
      .from('robots')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除资产失败: ' + err.message });
  }
};

// 批量更新状态
exports.batchUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !ids.length || !status) {
      return res.status(400).json({ error: '请选择资产和目标状态' });
    }

    const results = [];
    for (const id of ids) {
      const { data, error } = await supabase
        .from('robots')
        .update({ status, updater: req.user.display_name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!error) {
        results.push(data);
        await logChange(id, '状态', null, status, req.user.display_name);
      }
    }

    res.json({ data: results, updated: results.length });
  } catch (err) {
    res.status(500).json({ error: '批量更新失败: ' + err.message });
  }
};

// 批量删除
exports.batchDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ error: '请选择要删除的资产' });
    }

    const { error } = await supabase
      .from('robots')
      .delete()
      .in('id', ids);

    if (error) throw error;
    res.json({ message: `成功删除 ${ids.length} 条记录` });
  } catch (err) {
    res.status(500).json({ error: '批量删除失败: ' + err.message });
  }
};

// 获取变更日志
exports.getChangelog = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('change_log')
      .select('*')
      .eq('robot_id', req.params.id)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '获取变更日志失败: ' + err.message });
  }
};

// 获取筛选选项（所有去重的 type/status/location/person 值）
exports.getFilterOptions = async (req, res) => {
  try {
    const { data, error } = await supabase.from('robots').select('type, status, location, person, department');
    if (error) throw error;

    const unique = (arr) => [...new Set(arr.filter(Boolean))].sort();
    res.json({
      types: unique(data.map(r => r.type)),
      statuses: unique(data.map(r => r.status)),
      locations: unique(data.map(r => r.location)),
      persons: unique(data.map(r => r.person)),
      departments: unique(data.map(r => r.department)),
    });
  } catch (err) {
    res.status(500).json({ error: '获取筛选选项失败: ' + err.message });
  }
};

// ---- 辅助函数 ----

async function logChange(robot_id, field, old_value, new_value, changed_by) {
  await supabase.from('change_log').insert({
    robot_id, field, old_value, new_value, changed_by,
  });
}

function fieldLabel(key) {
  const labels = {
    type: '类型', serial: '序列号', status: '状态', person: '负责人',
    ip: 'IP地址', location: '位置', notes: '备注', borrowed: '借出状态',
    borrowed_to: '借用人', borrowed_at: '借出时间', return_due: '预计归还',
    image: '图片', barcode: '条形码', purchase_date: '采购日期',
    warranty_until: '保修到期', value: '资产价值', department: '部门',
  };
  return labels[key] || key;
}
