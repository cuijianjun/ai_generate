/**
 * 空号生成工具前端JavaScript
 */

// 当页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const generateForm = document.getElementById('generate-form');
    const generateBtn = document.getElementById('generate-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const countInput = document.getElementById('count');
    const operatorSelect = document.getElementById('operator');
    const prefixInput = document.getElementById('prefix');
    const excludeCheckbox = document.getElementById('exclude-4');
    const tailInput = document.getElementById('tail');
    const formatSelect = document.getElementById('format');
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultEmpty = document.getElementById('result-empty');
    const resultContent = document.getElementById('result-content');
    const numberCount = document.getElementById('number-count');
    const generationTime = document.getElementById('generation-time');
    const resultTbody = document.getElementById('result-tbody');
    const historyList = document.getElementById('history-list');

    // 存储生成的号码
    let generatedNumbers = [];

    // 绑定表单提交事件
    generateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        generateNumbers();
    });

    // 绑定导出按钮点击事件
    exportBtn.addEventListener('click', function () {
        exportNumbers();
    });

    // 绑定复制按钮点击事件
    copyBtn.addEventListener('click', function () {
        copyNumbers();
    });

    // 加载历史记录
    loadHistory();

    /**
     * 生成空号
     */
    function generateNumbers() {
        // 显示加载状态
        setLoading(true);

        // 获取表单参数
        const count = parseInt(countInput.value);
        const operator = operatorSelect.value;
        const prefix = prefixInput.value.trim();

        // 特殊要求
        const pattern = {};
        if (excludeCheckbox.checked) {
            pattern.exclude = ['4'];
        }

        if (tailInput.value.trim()) {
            pattern.tail = tailInput.value.trim();
        }

        // 构建请求参数
        const requestData = {
            count: count,
            operator: operator,
            output_format: 'json'
        };

        if (prefix) {
            requestData.prefix = prefix;
        }

        if (Object.keys(pattern).length > 0) {
            requestData.pattern = pattern;
        }

        // 发送请求
        fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('生成号码失败');
                }
                return response.json();
            })
            .then(data => {
                // 保存生成的号码
                generatedNumbers = data.numbers;

                // 显示结果
                displayResults(data);

                // 更新历史记录
                updateHistory(data);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('生成号码时出错: ' + error.message);
            })
            .finally(() => {
                // 隐藏加载状态
                setLoading(false);
            });
    }

    /**
     * 显示生成结果
     */
    function displayResults(data) {
        // 更新统计信息
        numberCount.textContent = data.numbers.length;
        generationTime.textContent = new Date().toLocaleString();

        // 清空结果表格
        resultTbody.innerHTML = '';

        // 填充表格
        data.numbers.forEach((item, index) => {
            const tr = document.createElement('tr');

            const tdIndex = document.createElement('td');
            tdIndex.textContent = index + 1;

            const tdNumber = document.createElement('td');
            tdNumber.textContent = item.number;

            const tdOperator = document.createElement('td');
            tdOperator.textContent = item.operator;

            const tdRegion = document.createElement('td');
            tdRegion.textContent = item.region;

            tr.appendChild(tdIndex);
            tr.appendChild(tdNumber);
            tr.appendChild(tdOperator);
            tr.appendChild(tdRegion);

            resultTbody.appendChild(tr);
        });

        // 显示结果区域
        resultEmpty.classList.add('d-none');
        resultContent.classList.remove('d-none');

        // 启用导出和复制按钮
        exportBtn.disabled = false;
        copyBtn.disabled = false;
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading) {
        if (isLoading) {
            generateBtn.disabled = true;
            loadingSpinner.classList.remove('d-none');
            generateBtn.textContent = ' 生成中...';
            generateBtn.prepend(loadingSpinner);
        } else {
            generateBtn.disabled = false;
            loadingSpinner.classList.add('d-none');
            generateBtn.textContent = '开始生成';
        }
    }

    /**
     * 导出生成的号码
     */
    function exportNumbers() {
        if (generatedNumbers.length === 0) {
            alert('没有可导出的号码');
            return;
        }

        // 获取导出格式
        const format = formatSelect.value;

        // 发送导出请求
        fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numbers: generatedNumbers,
                format: format
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('导出失败');
                }
                return response.blob();
            })
            .then(blob => {
                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');

                // 设置文件名
                const timestamp = new Date().toISOString().replace(/[^\d]/g, '').substring(0, 14);
                let filename = `phone_numbers_${timestamp}`;

                if (format === 'csv') {
                    filename += '.csv';
                } else if (format === 'excel') {
                    filename += '.xlsx';
                } else if (format === 'json') {
                    filename += '.json';
                }

                a.href = url;
                a.download = filename;

                // 触发下载
                document.body.appendChild(a);
                a.click();

                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('导出号码时出错: ' + error.message);
            });
    }

    /**
     * 复制生成的号码到剪贴板
     */
    function copyNumbers() {
        if (generatedNumbers.length === 0) {
            alert('没有可复制的号码');
            return;
        }

        // 提取号码文本
        const numbersText = generatedNumbers.map(item => item.number).join('\n');

        // 复制到剪贴板
        navigator.clipboard.writeText(numbersText)
            .then(() => {
                alert('已复制 ' + generatedNumbers.length + ' 个号码到剪贴板');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('复制到剪贴板失败: ' + error.message);

                // 回退方法：创建临时文本区域
                fallbackCopy(numbersText);
            });
    }

    /**
     * 回退的复制方法
     */
    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('已复制 ' + generatedNumbers.length + ' 个号码到剪贴板');
            } else {
                alert('复制失败，请手动复制');
            }
        } catch (err) {
            alert('复制失败，请手动复制');
        }

        document.body.removeChild(textArea);
    }

    /**
     * 加载历史记录
     */
    function loadHistory() {
        fetch('/api/history')
            .then(response => response.json())
            .then(data => {
                updateHistoryList(data.history);
            })
            .catch(error => {
                console.error('Error loading history:', error);
            });
    }

    /**
     * 更新历史记录
     */
    function updateHistory(data) {
        if (data && data.history_id) {
            loadHistory();
        }
    }

    /**
     * 更新历史记录列表
     */
    function updateHistoryList(history) {
        if (history && history.length > 0) {
            historyList.innerHTML = '';

            history.reverse().forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item';

                const timestamp = new Date(item.timestamp).toLocaleString();

                let operatorName = '全部';
                if (item.config.operator === 'mobile') operatorName = '移动';
                if (item.config.operator === 'unicom') operatorName = '联通';
                if (item.config.operator === 'telecom') operatorName = '电信';

                li.innerHTML = `
                    <div><strong>${item.count}个号码</strong> (${operatorName})</div>
                    <small class="text-muted">${timestamp}</small>
                `;

                historyList.appendChild(li);
            });
        } else {
            historyList.innerHTML = '<li class="list-group-item text-center text-muted">暂无生成记录</li>';
        }
    }
}); 