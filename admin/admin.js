// Admin Dashboard JavaScript
let currentUser = null;
let authToken = null;
let refreshInterval = null;
let charts = {};

// API Base URL - Update this to match your server
const API_BASE = window.location.origin + '/api';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeCharts();
});

// Authentication Functions
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        showLoading('Authenticating...');
        
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('admin_token', authToken);
            localStorage.setItem('admin_user', JSON.stringify(currentUser));
            
            showDashboard();
            loadDashboardData();
            startAutoRefresh();
            showAlert('Welcome to the admin dashboard!', 'success');
        } else {
            showAlert(data.message || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        hideLoading();
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
        loadDashboardData();
        startAutoRefresh();
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    authToken = null;
    currentUser = null;
    stopAutoRefresh();
    showLogin();
    showAlert('Logged out successfully', 'success');
}

function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

// Navigation Functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to corresponding menu item
    event.target.classList.add('active');
    
    // Update page title
    const titles = {
        overview: '📊 Dashboard Overview',
        users: '👥 User Management',
        transactions: '💰 Transaction Management',
        vip: '👑 VIP Management',
        contests: '🏆 Contest Management',
        analytics: '📈 Analytics',
        settings: '⚙️ Game Settings',
        broadcasts: '📢 Broadcast Center'
    };
    
    document.getElementById('pageTitle').textContent = titles[sectionName] || '📊 Dashboard';
    
    // Load section-specific data
    loadSectionData(sectionName);
}

async function loadSectionData(section) {
    switch (section) {
        case 'users':
            loadUsers();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'vip':
            loadVIPData();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        updateDashboardStats(data);
        updateUserGrowthChart(data.userGrowth || []);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Error loading dashboard data', 'danger');
    }
}

function updateDashboardStats(data) {
    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('activeUsers').textContent = data.activeUsers || 0;
    document.getElementById('vipUsers').textContent = data.vipUsers || 0;
    document.getElementById('activeCrops').textContent = data.activeCrops || 0;
    document.getElementById('totalSBR').textContent = (data.totalSBR || 0).toLocaleString();
    document.getElementById('totalRevenue').textContent = `$${(data.totalRevenue || 0).toFixed(2)}`;
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        updateUsersTable(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', 'danger');
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.telegram_id}</td>
            <td>${user.first_name}</td>
            <td>@${user.username || 'N/A'}</td>
            <td>
                ${user.vip_tier > 0 ? `<span class="badge badge-info">Tier ${user.vip_tier}</span>` : '<span class="badge badge-secondary">Free</span>'}
            </td>
            <td>${(user.sbr_coins || 0).toLocaleString()}</td>
            <td>
                ${user.is_banned ? '<span class="badge badge-danger">Banned</span>' : '<span class="badge badge-success">Active</span>'}
            </td>
            <td>
                <button class="btn btn-primary" onclick="editUser(${user.telegram_id})" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn ${user.is_banned ? 'btn-success' : 'btn-danger'}" 
                        onclick="${user.is_banned ? 'unbanUser' : 'banUser'}(${user.telegram_id})" 
                        title="${user.is_banned ? 'Unban' : 'Ban'} User">
                    <i class="fas ${user.is_banned ? 'fa-check' : 'fa-ban'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load transactions');
        
        const transactions = await response.json();
        updateTransactionsTable(transactions);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showAlert('Error loading transactions', 'danger');
    }
}

function updateTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${tx.id}</td>
            <td>${tx.first_name} (@${tx.username || 'N/A'})</td>
            <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
            <td>${tx.amount}</td>
            <td>${tx.currency}</td>
            <td>
                <span class="badge badge-${getStatusBadgeClass(tx.status)}">${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span>
            </td>
            <td>${new Date(tx.created_at).toLocaleDateString()}</td>
            <td>
                ${tx.status === 'pending' ? `
                    <button class="btn btn-success" onclick="approveTransaction(${tx.id})" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger" onclick="rejectTransaction(${tx.id})" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                ` : '<span class="badge badge-secondary">Processed</span>'}
            </td>
        </tr>
    `).join('');
}

async function loadVIPData() {
    try {
        const response = await fetch(`${API_BASE}/admin/vip-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load VIP data');
        
        const data = await response.json();
        updateVIPStats(data);
        
    } catch (error) {
        console.error('Error loading VIP data:', error);
        showAlert('Error loading VIP data', 'danger');
    }
}

function updateVIPStats(data) {
    document.getElementById('vipTier1').textContent = data.tier1 || 0;
    document.getElementById('vipTier2').textContent = data.tier2 || 0;
    document.getElementById('vipTier3').textContent = data.tier3 || 0;
    document.getElementById('vipTier4').textContent = data.tier4 || 0;
}

// Action Functions
async function banUser(telegramId) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/ban-user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ telegramId })
        });
        
        if (!response.ok) throw new Error('Failed to ban user');
        
        showAlert('User banned successfully', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error banning user:', error);
        showAlert('Error banning user', 'danger');
    }
}

async function unbanUser(telegramId) {
    try {
        const response = await fetch(`${API_BASE}/admin/unban-user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ telegramId })
        });
        
        if (!response.ok) throw new Error('Failed to unban user');
        
        showAlert('User unbanned successfully', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error unbanning user:', error);
        showAlert('Error unbanning user', 'danger');
    }
}

async function approveTransaction(transactionId) {
    if (!confirm('Are you sure you want to approve this transaction?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/approve-transaction`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactionId })
        });
        
        if (!response.ok) throw new Error('Failed to approve transaction');
        
        showAlert('Transaction approved successfully', 'success');
        loadTransactions();
        
    } catch (error) {
        console.error('Error approving transaction:', error);
        showAlert('Error approving transaction', 'danger');
    }
}

async function rejectTransaction(transactionId) {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/reject-transaction`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactionId, reason })
        });
        
        if (!response.ok) throw new Error('Failed to reject transaction');
        
        showAlert('Transaction rejected successfully', 'success');
        loadTransactions();
        
    } catch (error) {
        console.error('Error rejecting transaction:', error);
        showAlert('Error rejecting transaction', 'danger');
    }
}

async function setUserVIP() {
    const userId = document.getElementById('vipUserId').value;
    const tier = document.getElementById('vipTier').value;
    
    if (!userId || !tier) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/set-vip`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ telegramId: parseInt(userId), tier: parseInt(tier) })
        });
        
        if (!response.ok) throw new Error('Failed to set VIP status');
        
        showAlert('VIP status updated successfully', 'success');
        document.getElementById('vipUserId').value = '';
        document.getElementById('vipTier').value = '0';
        loadVIPData();
        
    } catch (error) {
        console.error('Error setting VIP status:', error);
        showAlert('Error setting VIP status', 'danger');
    }
}

async function addResourceToUser() {
    const userId = document.getElementById('resourceUserId').value;
    const resourceType = document.getElementById('resourceType').value;
    const amount = document.getElementById('resourceAmount').value;
    
    if (!userId || !resourceType || !amount) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/add-resource`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                telegramId: parseInt(userId), 
                resourceType, 
                amount: parseInt(amount) 
            })
        });
        
        if (!response.ok) throw new Error('Failed to add resource');
        
        showAlert('Resource added successfully', 'success');
        closeModal('resourceModal');
        document.getElementById('resourceUserId').value = '';
        document.getElementById('resourceAmount').value = '';
        
    } catch (error) {
        console.error('Error adding resource:', error);
        showAlert('Error adding resource', 'danger');
    }
}

async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage').value;
    const target = document.getElementById('broadcastTarget').value;
    
    if (!message.trim()) {
        showAlert('Please enter a message', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to send this message to ${target} users?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/broadcast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, target })
        });
        
        if (!response.ok) throw new Error('Failed to send broadcast');
        
        const result = await response.json();
        showAlert(`Broadcast sent to ${result.count} users successfully`, 'success');
        document.getElementById('broadcastMessage').value = '';
        
    } catch (error) {
        console.error('Error sending broadcast:', error);
        showAlert('Error sending broadcast', 'danger');
    }
}

async function updateGameSettings() {
    const settings = {
        sbrRate: document.getElementById('sbrRate').value,
        tonRate: document.getElementById('tonRate').value,
        maxWater: document.getElementById('maxWater').value,
        maxBoosters: document.getElementById('maxBoosters').value,
        dailyWater: document.getElementById('dailyWater').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Failed to update settings');
        
        showAlert('Settings updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating settings:', error);
        showAlert('Error updating settings', 'danger');
    }
}

// Chart Functions
function initializeCharts() {
    // User Growth Chart
    const userCtx = document.getElementById('userGrowthChart').getContext('2d');
    charts.userGrowth = new Chart(userCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'New Users',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'User Growth (Last 7 Days)',
                    color: 'white'
                },
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white'
                    }
                },
                x: {
                    ticks: {
                        color: 'white'
                    }
                }
            }
        }
    });
    
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    charts.revenue = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue ($)',
                data: [1200, 1900, 3000, 5000, 2000, 3000],
                backgroundColor: 'rgba(33, 150, 243, 0.7)',
                borderColor: '#2196F3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Revenue',
                    color: 'white'
                },
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white'
                    }
                },
                x: {
                    ticks: {
                        color: 'white'
                    }
                }
            }
        }
    });
    
    // Crop Chart
    const cropCtx = document.getElementById('cropChart').getContext('2d');
    charts.crop = new Chart(cropCtx, {
        type: 'doughnut',
        data: {
            labels: ['Potato', 'Tomato', 'Onion', 'Carrot'],
            datasets: [{
                data: [45, 30, 15, 10],
                backgroundColor: [
                    '#FF9800',
                    '#F44336',
                    '#9C27B0',
                    '#FF5722'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Crop Distribution',
                    color: 'white'
                },
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

function updateUserGrowthChart(data) {
    if (charts.userGrowth && data.length > 0) {
        charts.userGrowth.data.labels = data.map(d => d.date);
        charts.userGrowth.data.datasets[0].data = data.map(d => d.count);
        charts.userGrowth.update();
    }
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getStatusBadgeClass(status) {
    const classes = {
        pending: 'warning',
        completed: 'success',
        approved: 'success',
        rejected: 'danger'
    };
    return classes[status] || 'secondary';
}

function showLoading(message = 'Loading...') {
    // Implementation for showing loading state
    console.log('Loading:', message);
}

function hideLoading() {
    // Implementation for hiding loading state
    console.log('Loading complete');
}

function showAddResourceModal() {
    document.getElementById('resourceModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showBackupModal() {
    if (confirm('Do you want to download a backup of the database?')) {
        window.open(`${API_BASE}/admin/backup`, '_blank');
    }
}

// Search and Filter Functions
function searchUsers() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function filterUsers() {
    const filter = document.getElementById('userFilter').value;
    loadUsers(); // Reload with filter - implement server-side filtering
}

function filterTransactions() {
    const typeFilter = document.getElementById('transactionFilter').value;
    const currencyFilter = document.getElementById('currencyFilter').value;
    loadTransactions(); // Reload with filters - implement server-side filtering
}

// Mobile Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('mobile-hidden');
    mainContent.classList.toggle('expanded');
}

// Auto-refresh Functions
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadDashboardData();
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function refreshData() {
    loadDashboardData();
    const currentSection = document.querySelector('.content-section.active').id;
    loadSectionData(currentSection);
    showAlert('Data refreshed successfully', 'success');
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Handle escape key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// Export functions for global access
window.login = login;
window.logout = logout;
window.showSection = showSection;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.approveTransaction = approveTransaction;
window.rejectTransaction = rejectTransaction;
window.setUserVIP = setUserVIP;
window.addResourceToUser = addResourceToUser;
window.sendBroadcast = sendBroadcast;
window.updateGameSettings = updateGameSettings;
window.showAddResourceModal = showAddResourceModal;
window.closeModal = closeModal;
window.showBackupModal = showBackupModal;
window.searchUsers = searchUsers;
window.filterUsers = filterUsers;
window.filterTransactions = filterTransactions;
window.toggleSidebar = toggleSidebar;
window.refreshData = refreshData;