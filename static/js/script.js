// // scripts.js
// let tickers = []; // Array to store existing tickers

// const fetchStockData = async (symbol) => {
//     const apiKey = 'WT1S551YW8AYEHDG'; // 
//     const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${apiKey}`);
//     const data = await response.json();

//     // Log the API response to the console
//     console.log(data);

//     // Check if the response contains the expected data
//     if (data['Time Series (5min)']) {
//         const timeSeries = data['Time Series (5min)'];
//         const latestTime = Object.keys(timeSeries)[0]; // Get the latest time entry
//         const latestData = timeSeries[latestTime];

//         // Extract the price from the latest data
//         const price = parseFloat(latestData['1. open']); // You can use '1. open', '4. close', etc. based on your needs

//         // Update the table with the new ticker
//         updateTable(symbol, price);
//     } else {
//         console.error('Error fetching data:', data);
//     }
// };

// // Function to update the table with the new ticker and price
// const updateTable = (symbol, price) => {
//     const tbody = document.getElementById('portfolio-tbody');
//     const existingRow = Array.from(tbody.rows).find(row => row.cells[0].innerText === symbol);

//     if (existingRow) {
//         // Update the price in the existing row
//         existingRow.cells[2].innerText = price.toFixed(2);
//     } else {
//         // Create a new row if it doesn't exist
//         const newRow = document.createElement('tr');
//         newRow.innerHTML = `
//             <td>${symbol}</td>
//             <td>0</td> <!-- Placeholder for shares -->
//             <td>${price.toFixed(2)}</td> <!-- Display the price -->
//             <td>0.00</td> <!-- Placeholder for change -->
//             <td>0.00</td> <!-- Placeholder for market value -->
//             <td>0.00</td> <!-- Placeholder for P/L -->
//             <td><button class="remove-ticker">Remove</button></td>
//         `;
//         tbody.appendChild(newRow);
//         tickers.push(symbol); // Add the new ticker to the array
//     }
// };

// // Function to fetch prices for all existing tickers
// const fetchPricesForAllTickers = async () => {
//     for (const ticker of tickers) {
//         await fetchStockData(ticker);
//     }
// };

// // Event listener for the submit button
// document.getElementById('submit-ticker').addEventListener('click', (e) => {
//     e.preventDefault();
//     const symbol = document.getElementById('ticker-symbol').value;
//     fetchStockData(symbol);
// });

// // Event listener for the refresh button
// document.getElementById('refresh-prices').addEventListener('click', (e) => {
//     e.preventDefault();
//     fetchPricesForAllTickers();
// });

// // ... existing code ...

// // Add this function to save portfolio data
// function savePortfolioData() {
//     const portfolioData = [];
//     const rows = document.querySelectorAll('#portfolio-tbody tr');
    
//     rows.forEach(row => {
//         portfolioData.push({
//             ticker: row.querySelector('[data-ticker]').dataset.ticker,
//             shares: parseFloat(row.querySelector('[data-shares]').dataset.shares),
//             costBasis: parseFloat(row.querySelector('[data-cost-basis]').dataset.costBasis)
//         });
//     });
    
//     localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
// }

// // Add this function to load portfolio data
// function loadPortfolioData() {
//     const savedData = localStorage.getItem('portfolioData');
//     if (savedData) {
//         const portfolioData = JSON.parse(savedData);
//         portfolioData.forEach(item => {
//             addTickerToPortfolio(item.ticker, item.shares, item.costBasis);
//         });
//     }
// }

// // Modify your existing addTickerToPortfolio function to save after adding
// function addTickerToPortfolio(ticker, shares, costBasis) {
//     // ... existing add ticker code ...
    
//     // Add this at the end of the function
//     savePortfolioData();
// }

// // Add this to your delete ticker functionality
// function deleteTickerRow(row) {
//     row.remove();
//     savePortfolioData();
// }

// // Add this to your document ready or initialization code
// document.addEventListener('DOMContentLoaded', () => {
//     loadPortfolioData();
//     // ... rest of your initialization code ...
// });

// Initialize resize functionality for horizontal handles
document.querySelectorAll('.resize-handle-h').forEach(handle => {
    let startY, startHeight;
    
    handle.addEventListener('mousedown', startResize);

    function startResize(e) {
        startY = e.clientY;
        const box = handle.previousElementSibling;
        startHeight = parseInt(getComputedStyle(box).height, 10);
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection while resizing
        e.preventDefault();
    }

    function resize(e) {
        const box = handle.previousElementSibling;
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(50, startHeight + deltaY); // Minimum height of 50px
        box.style.height = newHeight + 'px';
    }

    function stopResize() {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
});

// Initialize resize functionality for vertical handle
const verticalHandle = document.querySelector('.resize-handle-v');
if (verticalHandle) {
    let startX, startWidth;
    
    verticalHandle.addEventListener('mousedown', startResize);

    function startResize(e) {
        startX = e.clientX;
        const leftPanel = verticalHandle.previousElementSibling;
        startWidth = parseInt(getComputedStyle(leftPanel).width, 10);
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection while resizing
        e.preventDefault();
    }

    function resize(e) {
        const leftPanel = verticalHandle.previousElementSibling;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(200, startWidth + deltaX); // Minimum width of 200px
        leftPanel.style.width = newWidth + 'px';
    }

    function stopResize() {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Initialize click handlers for section headers
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
        // Find the content container that follows this header
        const content = header.nextElementSibling;
        
        // Toggle the 'collapsed' class on the content
        content.classList.toggle('collapsed');
        
        // Toggle the arrow icon direction
        const arrow = header.querySelector('.arrow');
        if (arrow) {
            arrow.classList.toggle('down');
        }
        
        // If the section is being expanded, reset its height to auto
        if (!content.classList.contains('collapsed')) {
            content.style.height = 'auto';
        }
    });
});

// Add event listeners for analysis items
document.querySelectorAll('.analysis-item').forEach(item => {
    item.addEventListener('click', function() {
        // Toggle selected state of the clicked item
        this.classList.toggle('selected');
        
        // Optionally, you can remove the selected class from other items
        document.querySelectorAll('.analysis-item').forEach(otherItem => {
            if (otherItem !== this) {
                otherItem.classList.remove('selected');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize box headers
    const boxHeaders = document.querySelectorAll('.box-header.clickable');
    
    boxHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const minimizeBtn = this.querySelector('.minimize-btn');
            
            if (content.classList.contains('minimized')) {
                content.classList.remove('minimized');
                minimizeBtn.textContent = '−';
            } else {
                content.classList.add('minimized');
                minimizeBtn.textContent = '+';
            }
        });
    });

    // Add Back to Chart button handler
    const backToChartBtn = document.getElementById('back-to-chart');
    if (backToChartBtn) {
        backToChartBtn.addEventListener('click', function() {
            // Hide financial statements
            document.querySelector('.financial-statements-table').style.display = 'none';
            
            // Show chart
            document.querySelector('.chart-container').style.display = 'block';
            
            // Update button states in the data analysis section
            document.querySelectorAll('.data-analysis-section button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show all analysis buttons
            document.querySelectorAll('.data-analysis-section button').forEach(btn => {
                btn.style.display = 'block';
            });
        });
    }
});

function updateSentimentScore(newsData) {
    const sentimentElement = document.getElementById('sentiment-score');
    
    // Find the ticker sentiment for the selected stock
    const firstArticle = newsData.feed[0];
    const tickerSentiment = firstArticle.ticker_sentiment.find(
        t => t.ticker === selectedTicker
    );
    
    if (tickerSentiment) {
        const score = tickerSentiment.ticker_sentiment_score;
        sentimentElement.textContent = `(${score.toFixed(2)})`;
        
        // Add tooltip with sentiment label
        sentimentElement.title = `Sentiment: ${tickerSentiment.ticker_sentiment_label}`;
    } else {
        sentimentElement.textContent = '';
        sentimentElement.title = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');
    const loginForm = document.getElementById('login-form');
    const cancelLogin = document.getElementById('cancel-login');
    const submitLogin = document.getElementById('submit-login');

    loginBtn.addEventListener('click', () => {
        loginForm.style.display = 'block';
    });

    cancelLogin.addEventListener('click', () => {
        loginForm.style.display = 'none';
    });

    submitLogin.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        // Handle login logic here
        console.log('Login attempted:', username);
        loginForm.style.display = 'none';
    });
});

// Update the data analysis button click handler
document.querySelectorAll('.data-analysis-section button').forEach(button => {
    button.addEventListener('click', function() {
        const isFinancialStatementsBtn = this.getAttribute('data-target') === 'financial-statements';
        
        // Remove active class from all buttons
        document.querySelectorAll('.data-analysis-section button').forEach(btn => {
            btn.classList.remove('active');
            // Only hide non-financial-statements buttons
            if (!isFinancialStatementsBtn || btn !== this) {
                btn.style.display = 'none';
            }
        });
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Hide all content sections
        document.querySelectorAll('.analysis-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Show the selected content section
        const targetId = this.getAttribute('data-target');
        if (targetId) {
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        }
    });
});

