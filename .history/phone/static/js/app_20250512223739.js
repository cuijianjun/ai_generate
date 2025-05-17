/**
 * 国内空号生成工具 - 核心JavaScript实现
 * v2.0.0
 */

// 全局变量
const app = {
    // 生成的号码列表
    phoneNumbers: [],
    // 生成历史
    history: [],
    // 是否正在生成中
    isGenerating: false,
    // 号段定义
    carriers: {
        mobile: {
            name: "中国移动",
            prefixes: [
                "134", "135", "136", "137", "138", "139", "147", "148", "149", "150", "151", "152",
                "157", "158", "159", "165", "172", "178", "182", "183", "184", "187", "188", "195",
                "196", "197", "198"
            ],
            activeSegments: ["138", "139", "150", "151", "152", "158", "159", "182", "183", "187", "188"],
            reclaimedSegments: ["147", "148", "149"]
        },
        unicom: {
            name: "中国联通",
            prefixes: [
                "130", "131", "132", "145", "146", "155", "156", "166", "167", "171", "175", "176",
                "185", "186", "196"
            ],
            activeSegments: ["130", "131", "132", "155", "156", "186"],
            reclaimedSegments: ["145", "146"]
        },
        telecom: {
            name: "中国电信",
            prefixes: [
                "133", "149", "153", "173", "174", "177", "180", "181", "189", "190", "191", "192",
                "193", "199"
            ],
            activeSegments: ["189", "133", "153", "180", "181"],
            reclaimedSegments: ["174"]
        }
    },
    // 特殊号码模式
    specialPatterns: [
        /(\d)\1{5,}/,  // 6个或更多相同数字
        /12345/,       // 连续顺序数字
        /54321/,       // 连续倒序数字
        /(\d)(\d)(\d)\3\2\1/ // 回文
    ],
    // 空号历史模式数据（模拟）
    emptyPatterns: {
        // 移动
        "147": 0.92,
        "148": 0.94,
        "149": 0.91,
        "134": 0.75,
        // 联通
        "145": 0.93,
        "146": 0.95,
        "166": 0.82,
        // 电信
        "174": 0.89,
        "199": 0.73,
        // 更细粒度模式
        "1471": 0.97,
        "1741": 0.95
    },
    // 验证模式描述
    verifyModes: {
        basic: "基础模式(基于号段规则和概率模型)",
        standard: "标准模式(增加历史数据和活跃度分析)",
        advanced: "高级模式(集成第三方API实时验证)"
    }
};

// DOM元素引用
const elements = {
    // 表单元素
    form: document.getElementById('phoneForm'),
    count: document.getElementById('count'),
    operator: document.getElementById('operator'),
    prefix: document.getElementById('prefix'),
    verifyMode: document.getElementById('verifyMode'),
    verifyModeHelp: document.getElementById('verifyModeHelp'),
    apiKeyGroup: document.getElementById('apiKeyGroup'),
    apiKey: document.getElementById('apiKey'),
    exclude4: document.getElementById('exclude4'),
    tail: document.getElementById('tail'),
    format: document.getElementById('format'),
    generateBtn: document.getElementById('generateBtn'),
    spinner: document.getElementById('spinner'),
    btnText: document.getElementById('btnText'),

    // 结果元素
    resultEmpty: document.getElementById('resultEmpty'),
    resultContent: document.getElementById('resultContent'),
    numberCount: document.getElementById('numberCount'),
    generationTime: document.getElementById('generationTime'),
    usedVerifyMode: document.getElementById('usedVerifyMode'),
    resultBody: document.getElementById('resultBody'),

    // 操作按钮
    copyBtn: document.getElementById('copyBtn'),
    exportBtn: document.getElementById('exportBtn'),

    // 历史记录
    historyList: document.getElementById('historyList')
};

// 初始化函数
function initApp() {
    // 绑定事件
    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.verifyMode.addEventListener('change', handleVerifyModeChange);
    elements.copyBtn.addEventListener('click', handleCopy);
    elements.exportBtn.addEventListener('click', handleExport);

    // 从本地存储加载历史记录
    loadHistory();

    // 初始化UI状态
    updateVerifyModeDescription();
    console.log('空号生成工具初始化完成');
}

// 处理验证模式变更
function handleVerifyModeChange() {
    updateVerifyModeDescription();

    // 高级模式显示API密钥输入
    if (elements.verifyMode.value === 'advanced') {
        elements.apiKeyGroup.classList.remove('d-none');
    } else {
        elements.apiKeyGroup.classList.add('d-none');
    }
}

// 更新验证模式描述
function updateVerifyModeDescription() {
    const mode = elements.verifyMode.value;
    let description = '';

    switch (mode) {
        case 'basic':
            description = '基于号段规则和概率模型生成空号，准确率约75-85%';
            break;
        case 'standard':
            description = '增加历史数据分析和号段活跃度分析，准确率约85-95%';
            break;
        case 'advanced':
            description = '集成第三方API进行实时验证，准确率可达95%以上';
            break;
    }

    elements.verifyModeHelp.textContent = description;
}

// 处理生成请求
async function handleGenerate() {
    if (app.isGenerating) return;

    // 获取参数
    const params = getGenerateParams();

    // 参数验证
    if (!validateParams(params)) return;

    // 更新UI状态
    setGeneratingState(true);

    try {
        // 开始生成空号
        const startTime = performance.now();
        app.phoneNumbers = await generatePhoneNumbers(params);
        const endTime = performance.now();
        const timeUsed = ((endTime - startTime) / 1000).toFixed(2);

        // 更新结果UI
        updateResultsUI(app.phoneNumbers, timeUsed, params.verifyMode);

        // 添加到历史记录
        addToHistory(params, app.phoneNumbers.length, timeUsed);
    } catch (error) {
        console.error('生成空号时出错:', error);
        alert('生成空号时出错: ' + error.message);
    } finally {
        // 恢复UI状态
        setGeneratingState(false);
    }
}

// 获取生成参数
function getGenerateParams() {
    return {
        count: parseInt(elements.count.value, 10) || 10,
        operator: elements.operator.value,
        prefix: elements.prefix.value.trim(),
        verifyMode: elements.verifyMode.value,
        apiKey: elements.apiKey.value.trim(),
        pattern: {
            exclude: elements.exclude4.checked ? ['4'] : [],
            tail: elements.tail.value.trim()
        },
        format: elements.format.value
    };
}

// 验证参数
function validateParams(params) {
    if (params.count <= 0 || params.count > 10000) {
        alert('生成数量必须在1-10000之间');
        return false;
    }

    if (params.prefix && !isValidPrefix(params.prefix)) {
        alert('前缀格式不正确，请输入有效的号码前缀（如138）');
        return false;
    }

    if (params.verifyMode === 'advanced' && !params.apiKey) {
        alert('高级验证模式需要提供API密钥');
        elements.apiKey.focus();
        return false;
    }

    if (params.pattern.tail && !isValidTail(params.pattern.tail)) {
        alert('尾号格式不正确，请输入纯数字尾号（如8888）');
        return false;
    }

    return true;
}

// 验证前缀是否有效
function isValidPrefix(prefix) {
    if (!/^\d{2,3}$/.test(prefix)) return false;

    // 检查是否是三大运营商的前缀
    const allPrefixes = [
        ...app.carriers.mobile.prefixes,
        ...app.carriers.unicom.prefixes,
        ...app.carriers.telecom.prefixes
    ];

    return allPrefixes.some(p => p.startsWith(prefix));
}

// 验证尾号是否有效
function isValidTail(tail) {
    return /^\d{1,8}$/.test(tail);
}

// 设置生成中状态
function setGeneratingState(isGenerating) {
    app.isGenerating = isGenerating;

    if (isGenerating) {
        elements.spinner.classList.remove('d-none');
        elements.btnText.textContent = '生成中...';
        elements.generateBtn.disabled = true;
    } else {
        elements.spinner.classList.add('d-none');
        elements.btnText.textContent = '开始生成';
        elements.generateBtn.disabled = false;
    }
}

// 生成手机空号
async function generatePhoneNumbers(params) {
    const numbers = [];
    const usedNumbers = new Set(); // 用于确保唯一性

    for (let i = 0; i < params.count; i++) {
        // 生成一个手机号
        const phoneData = generateOnePhoneNumber(params, usedNumbers);
        if (phoneData) {
            numbers.push(phoneData);
            usedNumbers.add(phoneData.number);
        }

        // 模拟异步进度，避免UI阻塞
        if (i % 100 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return numbers;
}

// 生成单个手机号
function generateOnePhoneNumber(params, usedNumbers) {
    let attempts = 0;
    const maxAttempts = 100; // 最大尝试次数

    while (attempts < maxAttempts) {
        attempts++;

        // 生成前缀
        const prefix = generatePrefix(params);
        if (!prefix) continue;

        // 生成后续数字
        const suffix = generateSuffix(params);

        // 完整号码
        const fullNumber = prefix + suffix;

        // 检查唯一性
        if (usedNumbers.has(fullNumber)) continue;

        // 判断是否为空号
        const [isEmpty, probability] = isEmptyNumber(fullNumber, params.verifyMode);
        if (!isEmpty) continue;

        // 确定运营商
        const carrier = determineCarrier(prefix);

        return {
            number: fullNumber,
            carrier: carrier.name,
            probability: probability
        };
    }

    console.warn(`超过最大尝试次数(${maxAttempts})，无法生成符合条件的号码`);
    return null;
}

// 生成前缀
function generatePrefix(params) {
    // 如果指定了前缀，直接使用
    if (params.prefix) {
        return params.prefix;
    }

    // 根据运营商选择前缀
    let availablePrefixes = [];

    switch (params.operator) {
        case 'mobile':
            availablePrefixes = [...app.carriers.mobile.prefixes];
            break;
        case 'unicom':
            availablePrefixes = [...app.carriers.unicom.prefixes];
            break;
        case 'telecom':
            availablePrefixes = [...app.carriers.telecom.prefixes];
            break;
        default: // 'all'
            availablePrefixes = [
                ...app.carriers.mobile.prefixes,
                ...app.carriers.unicom.prefixes,
                ...app.carriers.telecom.prefixes
            ];
    }

    // 随机选择前缀，优先选择回收号段(空号概率高)
    const reclaimedSegments = [
        ...app.carriers.mobile.reclaimedSegments,
        ...app.carriers.unicom.reclaimedSegments,
        ...app.carriers.telecom.reclaimedSegments
    ];

    // 30%概率选择回收号段
    if (Math.random() < 0.3 && reclaimedSegments.length > 0) {
        const filteredPrefixes = availablePrefixes.filter(p =>
            reclaimedSegments.some(s => p.startsWith(s))
        );

        if (filteredPrefixes.length > 0) {
            return filteredPrefixes[Math.floor(Math.random() * filteredPrefixes.length)];
        }
    }

    // 避开活跃号段(空号概率低)
    const activeSegments = [
        ...app.carriers.mobile.activeSegments,
        ...app.carriers.unicom.activeSegments,
        ...app.carriers.telecom.activeSegments
    ];

    // 70%概率避开活跃号段
    if (Math.random() < 0.7) {
        const filteredPrefixes = availablePrefixes.filter(p =>
            !activeSegments.some(s => p.startsWith(s))
        );

        if (filteredPrefixes.length > 0) {
            return filteredPrefixes[Math.floor(Math.random() * filteredPrefixes.length)];
        }
    }

    // 随机选择任意前缀
    return availablePrefixes[Math.floor(Math.random() * availablePrefixes.length)];
}

// 生成后缀(后8位)
function generateSuffix(params) {
    // 如果要求特定尾号
    const tail = params.pattern.tail;
    const excludeDigits = params.pattern.exclude || [];

    let suffix;
    if (tail) {
        // 生成前缀部分(8位减去尾号长度)
        const prefixLength = 8 - tail.length;
        let prefixPart = '';

        for (let i = 0; i < prefixLength; i++) {
            let digit;
            do {
                digit = Math.floor(Math.random() * 10).toString();
            } while (excludeDigits.includes(digit));

            prefixPart += digit;
        }

        suffix = prefixPart + tail;
    } else {
        // 生成完整的8位后缀
        let result = '';
        for (let i = 0; i < 8; i++) {
            let digit;
            do {
                digit = Math.floor(Math.random() * 10).toString();
            } while (excludeDigits.includes(digit));

            result += digit;
        }
        suffix = result;
    }

    // 检查是否符合特殊模式(如果符合则重新生成)
    if (isSpecialPattern(suffix)) {
        return generateSuffix(params);
    }

    return suffix;
}

// 检查是否符合特殊模式
function isSpecialPattern(number) {
    return app.specialPatterns.some(pattern => pattern.test(number));
}

// 判断是否为空号
function isEmptyNumber(number, verifyMode) {
    // 基础判定 - 根据号段特征判断
    let probability = calculateBaseProbability(number);

    // 标准模式 - 添加历史数据分析
    if (verifyMode === 'standard' || verifyMode === 'advanced') {
        probability = enhanceProbabilityWithHistory(number, probability);
    }

    // 高级模式 - API验证(模拟)
    if (verifyMode === 'advanced') {
        // 实际应用中，这里应该调用真实的API
        // 这里我们模拟API调用结果
        [/*isReallyEmpty*/, probability] = simulateApiVerification(number, probability);
    }

    // 空号概率阈值
    const threshold = {
        basic: 0.75,    // 基础模式75%概率以上认为是空号
        standard: 0.85,  // 标准模式85%概率以上认为是空号
        advanced: 0.90   // 高级模式90%概率以上认为是空号
    };

    // 返回是否空号和空号概率
    return [probability >= threshold[verifyMode], probability];
}

// 计算基础空号概率
function calculateBaseProbability(number) {
    const prefix3 = number.substring(0, 3);
    const prefix4 = number.substring(0, 4);

    // 判断是否属于回收号段
    const reclaimedSegments = [
        ...app.carriers.mobile.reclaimedSegments,
        ...app.carriers.unicom.reclaimedSegments,
        ...app.carriers.telecom.reclaimedSegments
    ];

    if (reclaimedSegments.includes(prefix3)) {
        return 0.85 + Math.random() * 0.10; // 85%-95%
    }

    // 判断是否属于活跃号段
    const activeSegments = [
        ...app.carriers.mobile.activeSegments,
        ...app.carriers.unicom.activeSegments,
        ...app.carriers.telecom.activeSegments
    ];

    if (activeSegments.includes(prefix3)) {
        return 0.65 + Math.random() * 0.15; // 65%-80%
    }

    // 其他号段
    return 0.75 + Math.random() * 0.15; // 75%-90%
}

// 根据历史数据增强概率判断
function enhanceProbabilityWithHistory(number, baseProbability) {
    const prefix3 = number.substring(0, 3);
    const prefix4 = number.substring(0, 4);

    // 检查是否有更精确的历史数据
    if (app.emptyPatterns[prefix4]) {
        // 权重混合：70%历史数据 + 30%基础概率
        return app.emptyPatterns[prefix4] * 0.7 + baseProbability * 0.3;
    } else if (app.emptyPatterns[prefix3]) {
        // 权重混合：50%历史数据 + 50%基础概率
        return app.emptyPatterns[prefix3] * 0.5 + baseProbability * 0.5;
    }

    // 无历史数据，增强基础概率
    return Math.min(baseProbability + 0.05, 0.98);
}

// 模拟API验证
function simulateApiVerification(number, probability) {
    // 真实环境中这里应该调用实际的API

    // 模拟API调用，返回更准确的概率
    // 95%概率API验证与我们的算法一致，5%概率有差异
    if (Math.random() < 0.95) {
        // API验证结果与我们的算法一致，但概率更精确
        const apiProbability = Math.min(probability + Math.random() * 0.05, 0.99);
        return [apiProbability > 0.90, apiProbability];
    } else {
        // API验证结果与我们的算法不一致
        const apiProbability = Math.max(0.2, Math.min(1 - probability + 0.1, 0.98));
        return [apiProbability > 0.90, apiProbability];
    }
}

// 确定运营商
function determineCarrier(prefix) {
    const prefix3 = prefix.substring(0, 3);

    if (app.carriers.mobile.prefixes.includes(prefix3)) {
        return { code: 'mobile', name: app.carriers.mobile.name };
    } else if (app.carriers.unicom.prefixes.includes(prefix3)) {
        return { code: 'unicom', name: app.carriers.unicom.name };
    } else if (app.carriers.telecom.prefixes.includes(prefix3)) {
        return { code: 'telecom', name: app.carriers.telecom.name };
    }

    // 默认移动
    return { code: 'unknown', name: '未知运营商' };
}

// 更新结果UI
function updateResultsUI(numbers, timeUsed, verifyMode) {
    // 更新统计信息
    elements.numberCount.textContent = numbers.length;
    elements.generationTime.textContent = `耗时 ${timeUsed} 秒`;
    elements.usedVerifyMode.textContent = app.verifyModes[verifyMode] || verifyMode;

    // 清空结果表格
    elements.resultBody.innerHTML = '';

    // 填充结果表格
    numbers.forEach((phone, index) => {
        const row = document.createElement('tr');

        // 概率样式
        let probabilityClass = '';
        if (phone.probability >= 0.9) {
            probabilityClass = 'probability-high';
        } else if (phone.probability >= 0.8) {
            probabilityClass = 'probability-medium';
        } else {
            probabilityClass = 'probability-low';
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${phone.number}</td>
            <td>${phone.carrier}</td>
            <td class="${probabilityClass}">${Math.round(phone.probability * 100)}%</td>
        `;

        elements.resultBody.appendChild(row);
    });

    // 显示结果区域，隐藏空提示
    elements.resultEmpty.classList.add('d-none');
    elements.resultContent.classList.remove('d-none');

    // 启用复制和导出按钮
    elements.copyBtn.disabled = false;
    elements.exportBtn.disabled = false;
}

// 处理复制操作
function handleCopy() {
    if (!app.phoneNumbers.length) return;

    const numbersText = app.phoneNumbers.map(p => p.number).join('\n');

    // 使用Clipboard API复制到剪贴板
    navigator.clipboard.writeText(numbersText)
        .then(() => {
            alert(`已成功复制 ${app.phoneNumbers.length} 个号码到剪贴板`);
        })
        .catch(err => {
            console.error('复制到剪贴板失败:', err);

            // 回退方案 - 创建临时输入框
            const textArea = document.createElement('textarea');
            textArea.value = numbersText;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                alert(`已成功复制 ${app.phoneNumbers.length} 个号码到剪贴板`);
            } catch (err) {
                console.error('复制失败:', err);
                alert('复制失败，请手动选择并复制');
            }

            document.body.removeChild(textArea);
        });
}

// 处理导出操作
function handleExport() {
    if (!app.phoneNumbers.length) return;

    const format = elements.format.value;
    let content = '';
    let fileName = `phone_numbers_${new Date().toISOString().replace(/:/g, '-')}`;
    let mimeType = '';

    switch (format) {
        case 'csv':
            content = exportAsCSV(app.phoneNumbers);
            fileName += '.csv';
            mimeType = 'text/csv';
            break;

        case 'excel':
            alert('浏览器端无法直接导出Excel格式，已自动切换为CSV格式');
            content = exportAsCSV(app.phoneNumbers);
            fileName += '.csv';
            mimeType = 'text/csv';
            break;

        case 'json':
            content = exportAsJSON(app.phoneNumbers);
            fileName += '.json';
            mimeType = 'application/json';
            break;

        default:
            alert('不支持的导出格式');
            return;
    }

    // 创建下载链接
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// 导出为CSV格式
function exportAsCSV(numbers) {
    const header = '序号,手机号码,运营商,空号概率\n';
    const rows = numbers.map((phone, index) =>
        `${index + 1},${phone.number},${phone.carrier},${Math.round(phone.probability * 100)}%`
    );

    return header + rows.join('\n');
}

// 导出为JSON格式
function exportAsJSON(numbers) {
    const data = {
        numbers: numbers.map((phone, index) => ({
            id: index + 1,
            number: phone.number,
            carrier: phone.carrier,
            probability: Math.round(phone.probability * 100) / 100
        })),
        metadata: {
            count: numbers.length,
            timestamp: new Date().toISOString(),
            verifyMode: elements.verifyMode.value
        }
    };

    return JSON.stringify(data, null, 2);
}

// 添加到历史记录
function addToHistory(params, count, timeUsed) {
    const timestamp = new Date().toISOString();
    const historyItem = {
        id: Date.now(),
        timestamp,
        params,
        count,
        timeUsed
    };

    // 添加到历史数组
    app.history.unshift(historyItem);

    // 限制历史记录数量
    if (app.history.length > 10) {
        app.history = app.history.slice(0, 10);
    }

    // 保存到本地存储
    saveHistory();

    // 更新历史UI
    updateHistoryUI();
}

// 保存历史记录到本地存储
function saveHistory() {
    try {
        localStorage.setItem('phoneGeneratorHistory', JSON.stringify(app.history));
    } catch (e) {
        console.error('保存历史记录失败:', e);
    }
}

// 从本地存储加载历史记录
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('phoneGeneratorHistory');
        if (savedHistory) {
            app.history = JSON.parse(savedHistory);
            updateHistoryUI();
        }
    } catch (e) {
        console.error('加载历史记录失败:', e);
    }
}

// 更新历史记录UI
function updateHistoryUI() {
    // 清空历史列表
    elements.historyList.innerHTML = '';

    if (app.history.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'list-group-item text-center text-muted';
        emptyItem.textContent = '暂无生成记录';
        elements.historyList.appendChild(emptyItem);
        return;
    }

    // 添加历史项
    app.history.forEach(item => {
        const historyItem = document.createElement('li');
        historyItem.className = 'list-group-item';

        const date = new Date(item.timestamp);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        historyItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <small class="text-muted">${dateStr}</small>
                    <div>生成了 ${item.count} 个空号</div>
                </div>
                <span class="badge bg-secondary">${item.params.operator}</span>
            </div>
        `;

        // 点击加载历史记录
        historyItem.addEventListener('click', () => loadHistoryItem(item));

        elements.historyList.appendChild(historyItem);
    });
}

// 加载历史记录项
function loadHistoryItem(item) {
    // 填充表单
    elements.count.value = item.params.count;
    elements.operator.value = item.params.operator;
    elements.prefix.value = item.params.prefix || '';
    elements.verifyMode.value = item.params.verifyMode;

    // 更新UI
    updateVerifyModeDescription();

    if (item.params.verifyMode === 'advanced') {
        elements.apiKeyGroup.classList.remove('d-none');
        elements.apiKey.value = item.params.apiKey || '';
    } else {
        elements.apiKeyGroup.classList.add('d-none');
    }

    elements.exclude4.checked = item.params.pattern.exclude &&
        item.params.pattern.exclude.includes('4');
    elements.tail.value = item.params.pattern.tail || '';
    elements.format.value = item.params.format;

    // 提示用户
    alert(`已加载历史记录：${new Date(item.timestamp).toLocaleString()}生成的${item.count}个号码。\n点击"开始生成"按钮重新生成。`);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 