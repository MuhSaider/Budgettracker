// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://euqygknzcfouugnhujcp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXlna256Y2ZvdXVnbmh1amNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTg3MTUsImV4cCI6MjA4MjI5NDcxNX0.3KDqwiBgCl2KVv9OW6hMo6kVBC-EBirQLLuftMC2xYs';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- STATE MANAGEMENT ---
let transactions = [];
let expenseChartInstance = null;

// --- FORMAT RUPIAH ---
const formatIDR = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// --- INIT APLIKASI ---
document.addEventListener('DOMContentLoaded', () => {
    fetchTransactions();
    
    document.getElementById('transaction-form').addEventListener('submit', handleAddTransaction);
});

// --- AMBIL DATA DARI SUPABASE ---
async function fetchTransactions() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    transactions = data;
    updateUI();
}

// --- TAMBAH TRANSAKSI KE SUPABASE ---
async function handleAddTransaction(e) {
    e.preventDefault();

    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    const newTransaction = { type, amount, category, description };

    const { data, error } = await supabase
        .from('transactions')
        .insert([newTransaction])
        .select();

    if (error) {
        alert('Gagal menyimpan transaksi: ' + error.message);
        return;
    }

    // Reset Form
    document.getElementById('transaction-form').reset();
    
    // Update State & UI
    transactions.unshift(data[0]);
    updateUI();
}

// --- HAPUS TRANSAKSI ---
async function deleteTransaction(id) {
    if(!confirm('Hapus transaksi ini?')) return;

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Gagal menghapus transaksi.');
        return;
    }

    transactions = transactions.filter(t => t.id !== id);
    updateUI();
}

// --- UPDATE TAMPILAN (SALDO, LIST, CHART) ---
function updateUI() {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    const listContainer = document.getElementById('transaction-list');
    listContainer.innerHTML = '';

    transactions.forEach(t => {
        // Kalkulasi Saldo
        if (t.type === 'income') {
            totalIncome += parseFloat(t.amount);
        } else {
            totalExpense += parseFloat(t.amount);
            
            // Kalkulasi Kategori untuk Chart (hanya pengeluaran)
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
        }

        // Render List
        const li = document.createElement('li');
        li.className = 'transaction-item';
        const isIncome = t.type === 'income';
        
        li.innerHTML = `
            <div class="t-info">
                <h4>${t.category}</h4>
                <p>${t.description || '-'} | ${new Date(t.created_at).toLocaleDateString('id-ID')}</p>
            </div>
            <div class="t-amount">
                <span class="${isIncome ? 'text-green' : 'text-red'}">
                    ${isIncome ? '+' : '-'}${formatIDR(t.amount)}
                </span>
                <button class="btn-delete" onclick="deleteTransaction('${t.id}')">×</button>
            </div>
        `;
        listContainer.appendChild(li);
    });

    const totalBalance = totalIncome - totalExpense;

    // Update Text Saldo
    document.getElementById('total-balance').innerText = formatIDR(totalBalance);
    document.getElementById('total-income').innerText = formatIDR(totalIncome);
    document.getElementById('total-expense').innerText = formatIDR(totalExpense);

    updateChart(categoryTotals);
}

// --- UPDATE GRAFIK CHART.JS ---
function updateChart(categoryTotals) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    // Warna pastel modern untuk chart
    const colors = ['#ff9fb1', '#ffc49f', '#ffdf9f', '#9fffb1', '#9fcdff', '#c49fff'];

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Belum ada pengeluaran'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? colors : ['#e0e5ec'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}
