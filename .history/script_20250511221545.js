// 工资计算器主脚本
// 需求：动态表单、工资计算、排行榜、Excel导入导出、报废率奖惩、模板下载、交互优化、数据本地保存

document.addEventListener('DOMContentLoaded', function () {
    // DOM元素
    const formRows = document.getElementById('formRows');
    const addRowBtn = document.getElementById('addRowBtn');
    const calcBtn = document.getElementById('calcBtn');
    const resultTableContainer = document.getElementById('resultTableContainer');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const importExcel = document.getElementById('importExcel');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

    // 初始化：恢复本地数据或添加一行
    const saved = loadFromStorage();
    if (saved.length > 0) {
        saved.forEach(row => addFormRow(row));
    } else {
        addFormRow();
    }

    // 事件绑定
    addRowBtn.onclick = () => { addFormRow(); saveAllRows(); };
    calcBtn.onclick = () => { calculateAll(); saveAllRows(); };
    exportExcelBtn.onclick = exportToExcel;
    importExcel.onchange = handleImportExcel;
    downloadTemplateBtn.onclick = downloadTemplate;

    // 添加一行表单
    function addFormRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'form-row';
        row.innerHTML = `
            <input type="text" placeholder="姓名" value="${data.name || ''}" class="input-name">
            <select class="input-type">
                <option value="全职" ${data.type === '全职' ? 'selected' : ''}>全职</option>
                <option value="兼职" ${data.type === '兼职' ? 'selected' : ''}>兼职</option>
            </select>
            <input type="number" min="0" placeholder="成功单量" value="${data.success || ''}" class="input-success">
            <input type="number" min="0" placeholder="失败单量" value="${data.fail || ''}" class="input-fail">
            <button type="button" class="remove-btn">删除</button>
        `;
        row.querySelector('.remove-btn').onclick = function () {
            row.remove();
            saveAllRows();
        };
        // 任何输入变动都自动保存
        row.querySelectorAll('input,select').forEach(input => {
            input.onchange = saveAllRows;
        });
        formRows.appendChild(row);
    }

    // 下载Excel模板
    function downloadTemplate() {
        const ws_data = [
            ['姓名', '类型', '成功单量', '失败单量'],
            ['张三', '全职', 1200, 50],
            ['李四', '兼职', 800, 30]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '模板');
        XLSX.writeFile(wb, '工资导入模板.xlsx');
    }

    // Excel导入
    function handleImportExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            // 期望表头：姓名、类型、成功单量、失败单量
            formRows.innerHTML = '';
            let imported = 0;
            for (let i = 1; i < json.length; i++) {
                const [name, type, success, fail] = json[i];
                if (name || type || success || fail) {
                    addFormRow({ name, type, success, fail });
                    imported++;
                }
            }
            saveAllRows();
            if(imported > 0) {
                alert('导入成功，共导入 ' + imported + ' 行数据。');
            } else {
                alert('未检测到有效数据，请检查模板内容。');
            }
        };
        reader.readAsBinaryString(file);
    }

    // 保存所有行到localStorage，重复名字以最新为准
    function saveAllRows() {
        const rows = Array.from(formRows.children);
        const data = rows.map(row => {
            return {
                name: row.querySelector('.input-name').value.trim(),
                type: row.querySelector('.input-type').value,
                success: parseInt(row.querySelector('.input-success').value) || 0,
                fail: parseInt(row.querySelector('.input-fail').value) || 0
            };
        }).filter(item => item.name && (item.success > 0 || item.fail > 0));
        // 以名字为key，后出现的覆盖前面的
        const map = {};
        data.forEach(item => { map[item.name] = item; });
        const unique = Object.values(map);
        localStorage.setItem('salaryData', JSON.stringify(unique));
    }

    // 加载本地数据
    function loadFromStorage() {
        try {
            const str = localStorage.getItem('salaryData');
            if (!str) return [];
            return JSON.parse(str);
        } catch {
            return [];
        }
    }

    // 工资计算主流程
    function calculateAll() {
        // 采集所有行数据
        const rows = Array.from(formRows.children);
        const data = rows.map(row => {
            return {
                name: row.querySelector('.input-name').value.trim(),
                type: row.querySelector('.input-type').value,
                success: parseInt(row.querySelector('.input-success').value) || 0,
                fail: parseInt(row.querySelector('.input-fail').value) || 0
            };
        }).filter(item => item.name && (item.success > 0 || item.fail > 0));
        // 以名字为key，后出现的覆盖前面的
        const map = {};
        data.forEach(item => { map[item.name] = item; });
        const unique = Object.values(map);
        if (unique.length === 0) {
            alert('请至少输入一行有效数据');
            return;
        }
        // 计算每个人的工资明细
        const results = unique.map(calcSalaryDetail);
        // 排序生成排行榜
        results.sort((a, b) => b.totalSalary - a.totalSalary);
        // 渲染表格
        renderResultTable(results);
        // 自动滚动到结果区
        setTimeout(() => {
            document.querySelector('.result-section').scrollIntoView({ behavior: 'smooth' });
        }, 200);
        // 保存最新数据
        localStorage.setItem('salaryData', JSON.stringify(unique));
    }

    // 计算单个人的工资明细
    function calcSalaryDetail({ name, type, success, fail }) {
        // 计算报废率
        const total = success + fail;
        const scrapRate = total > 0 ? fail / total : 0;
        let baseSalary = 0;
        let commission = 0;
        let commissionDetail = [];
        let totalSalary = 0;
        let costPerOrder = 0;
        let scrapReward = 1.03; // 默认达标
        let scrapRemark = '';
        // 报废奖惩
        if (scrapRate <= 0.07) {
            scrapReward = 1.03;
            scrapRemark = '达标，奖励3%提成';
        } else if (scrapRate > 0.1) {
            scrapReward = 0;
            scrapRemark = '>10%，提成冻结';
        } else {
            // 超标每1%扣3%提成
            const over = Math.ceil((scrapRate - 0.07) * 100);
            scrapReward = 1.03 - over * 0.03;
            scrapRemark = `超标${over}%扣${over * 3}%提成`;
        }
        // 计算提成分段
        let remain = success;
        if (type === '全职') {
            if (success > 500) baseSalary = 2000;
            const segs = [500, 500, 500, Infinity];
            const rates = [2.5, 3.5, 4.5, 5.5];
            for (let i = 0; i < segs.length && remain > 0; i++) {
                const seg = Math.min(remain, segs[i]);
                commission += seg * rates[i];
                commissionDetail.push(`${seg}×${rates[i]}`);
                remain -= seg;
            }
            totalSalary = (baseSalary + commission) * scrapReward;
            costPerOrder = success > 0 ? totalSalary / success + 3 : 0;
        } else {
            // 兼职
            const segs = [500, 500, 500, Infinity];
            const rates = [3.5, 4.0, 5.0, 5.5];
            for (let i = 0; i < segs.length && remain > 0; i++) {
                const seg = Math.min(remain, segs[i]);
                commission += seg * rates[i];
                commissionDetail.push(`${seg}×${rates[i]}`);
                remain -= seg;
            }
            totalSalary = commission * scrapReward;
            // 单均成本 = 总薪资/成功单量 + [3元×(≤1000单占比) + 1.5元×(>1000单占比)]
            let less1000 = Math.min(success, 1000);
            let more1000 = Math.max(success - 1000, 0);
            costPerOrder = success > 0 ? totalSalary / success + (3 * (less1000 / success) + 1.5 * (more1000 / success)) : 0;
        }
        // 提成冻结时，工资和成本为0
        if (scrapReward === 0) {
            totalSalary = 0;
            costPerOrder = 0;
        }
        return {
            name,
            type,
            success,
            fail,
            scrapRate: (scrapRate * 100).toFixed(2) + '%',
            baseSalary,
            commission,
            commissionDetail: commissionDetail.join(' + '),
            scrapRemark,
            totalSalary: Math.round(totalSalary * 100) / 100,
            costPerOrder: Math.round(costPerOrder * 100) / 100
        };
    }

    // 渲染工资明细和排行榜
    function renderResultTable(results) {
        let html = `<table class="salary-table"><thead><tr>
            <th>排名</th><th>姓名</th><th>类型</th><th>成功单量</th><th>失败单量</th><th>报废率</th><th>底薪</th><th>提成明细</th><th>提成合计</th><th>报废奖惩</th><th>总薪资</th><th>单均成本</th>
        </tr></thead><tbody>`;
        results.forEach((r, idx) => {
            html += `<tr${idx === 0 ? ' class="highlight"' : ''}>
                <td>${idx + 1}</td>
                <td>${r.name}</td>
                <td>${r.type}</td>
                <td>${r.success}</td>
                <td>${r.fail}</td>
                <td>${r.scrapRate}</td>
                <td>${r.baseSalary}</td>
                <td>${r.commissionDetail}</td>
                <td>${r.commission}</td>
                <td>${r.scrapRemark}</td>
                <td>${r.totalSalary}</td>
                <td>${r.costPerOrder}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        resultTableContainer.innerHTML = html;
    }

    // 导出Excel
    function exportToExcel() {
        const table = resultTableContainer.querySelector('table');
        if (!table) {
            alert('请先计算并生成工资表');
            return;
        }
        const wb = XLSX.utils.table_to_book(table, { sheet: '工资表' });
        XLSX.writeFile(wb, '工资表与排行榜.xlsx');
    }
}); 