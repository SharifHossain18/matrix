document.addEventListener('DOMContentLoaded', () => {
    const metersContainer = document.getElementById('meters-container');
    const refreshBtn = document.getElementById('refresh-btn');

    // Add loading class initially
    document.body.classList.add('loading');

    async function fetchBalance() {
        try {
            refreshBtn.classList.add('spinning');
            
            // Add a cache-busting timestamp in production, but try to fetch local api/balance.json
            const response = await fetch('api/balance.json?t=' + new Date().getTime());
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            updateUI(data);
        } catch (error) {
            console.error('Error fetching balance:', error);
            
            // Try to load from localStorage as fallback
            const cachedData = localStorage.getItem('dpdc_balance_cache');
            if (cachedData) {
                updateUI(JSON.parse(cachedData), true);
            } else {
                metersContainer.innerHTML = '<p style="text-align:center; color: #ef4444;">Offline. No cached data available.</p>';
            }
        } finally {
            setTimeout(() => {
                refreshBtn.classList.remove('spinning');
                document.body.classList.remove('loading');
            }, 500); // Small delay for visual feedback
        }
    }

    function updateUI(dataArray, isCached = false) {
        // Save to cache
        if (!isCached) {
            localStorage.setItem('dpdc_balance_cache', JSON.stringify(dataArray));
        }

        metersContainer.innerHTML = ''; // Clear container

        if (!Array.isArray(dataArray)) {
            dataArray = [dataArray]; // Handle old single object format if cached
        }

        dataArray.forEach(data => {
            const isActive = data.connectionStatus.toLowerCase() === 'active';
            const statusClass = isActive ? 'active' : 'offline';
            const statusText = isActive ? 'Active' : data.connectionStatus;
            
            const cardHTML = `
                <div class="balance-card glass">
                    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <p class="card-label">Meter ${data.meterNumber}</p>
                        <div class="status-badge ${statusClass}">
                            <span class="pulse"></span>
                            <span>${statusText}</span>
                        </div>
                    </div>
                    <div class="balance-amount">
                        <span class="currency">৳</span>
                        <span id="balance-value">${formatCurrency(data.balanceRemaining)}</span>
                    </div>
                    
                    <div class="card-details">
                        <div class="detail-item">
                            <span class="detail-label">Account ID</span>
                            <span class="detail-value">${data.accountId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Updated</span>
                            <span class="detail-value">${getRelativeTime(new Date(data.lastUpdated))}</span>
                        </div>
                    </div>
                </div>
            `;
            metersContainer.innerHTML += cardHTML;
        });
    }

    function formatCurrency(num) {
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getRelativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const daysDifference = Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
        const hoursDifference = Math.round((date - new Date()) / (1000 * 60 * 60));
        const minutesDifference = Math.round((date - new Date()) / (1000 * 60));

        if (Math.abs(minutesDifference) < 60) {
            if (minutesDifference === 0) return 'Just now';
            return rtf.format(minutesDifference, 'minute');
        } else if (Math.abs(hoursDifference) < 24) {
            return rtf.format(hoursDifference, 'hour');
        } else {
            return rtf.format(daysDifference, 'day');
        }
    }

    refreshBtn.addEventListener('click', fetchBalance);

    // Initial fetch
    fetchBalance();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
});
