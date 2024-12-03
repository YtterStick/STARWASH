function initializeDashboardChart() {
    const canvas = document.getElementById('incomeChart');
    
    if (canvas) {
        const ctx = canvas.getContext('2d');

        const data = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], // X-axis labels
            datasets: [
                {
                    label: 'Income',
                    data: [12000, 15000, 13000, 17000, 14000, 16000, 18000, 19000, 21000, 22000, 25000, 27000], //Data points for Income
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', //color for the Income bars
                    borderColor: 'rgba(75, 192, 192, 1)', //Border color for the Income bars
                    borderWidth: 1
                },
                {
                    label: 'Sales',
                    data: [10000, 12000, 11000, 16000, 13000, 15000, 17000, 16000, 20000, 21000, 24000, 26000],
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white' //Y-axis label color
                    }
                },
                x: {
                    ticks: {
                        color: 'white' //X-axis label color
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white' //Legend text color
                    }
                },
                tooltip: {
                    titleColor: 'white', //title color
                    bodyColor: 'white'  // Text color
                }
            }
        };

        //sales chart
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    } else {
        console.error('Canvas element not found for chart');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardChart);
} else {
    initializeDashboardChart();
}

function initializeServiceSalesChart() {
    const ctx = document.getElementById('serviceSalesChart').getContext('2d');
    const data = {
        labels: ['Wash', 'Dry Cleaning', 'Special Service'],
        datasets: [{
            label: 'Sales by Service Type',
            data: [120000, 50000, 30000],
            backgroundColor: ['rgba(255, 159, 64, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'],
            borderColor: ['rgba(255, 159, 64, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)'],
            borderWidth: 1
        }]
    };

    const options = {
        responsive: true,
        scales: {
            y: { beginAtZero: true },
            x: { ticks: { color: 'white' } }
        },
        plugins: {
            legend: { labels: { color: 'white' } }
        }
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

// Initialize the Monthly Sales Trend Chart
function initializeMonthlySalesTrendChart() {
    const ctx = document.getElementById('monthlySalesTrendChart').getContext('2d');
    const data = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        datasets: [{
            label: 'Sales Trend (Monthly)',
            data: [12000, 15000, 13000, 17000, 14000, 16000, 18000, 20000, 21000, 22000, 25000, 23000], // Example data (in dollars)
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1
        }]
    };

    const options = {
        responsive: true,
        scales: {
            y: { beginAtZero: true },
            x: { ticks: { color: 'white' } }
        },
        plugins: {
            legend: { labels: { color: 'white' } }
        }
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

