import config from '/static/js/config.js';

const portfolio = {
    init() {
        this.tbody = document.getElementById('portfolio-tbody');
        this.addBtn = document.getElementById('add-ticker-btn');
        this.form = document.getElementById('add-ticker-form');
        this.submitBtn = document.getElementById('submit-ticker');
        this.cancelBtn = document.getElementById('cancel-add-ticker');
        
        // Initialize headers with sort indicators
        document.querySelectorAll('#portfolio-table th[data-column]').forEach(header => {
            if (header.dataset.sortable !== 'false') {
                // Create a container for header content
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.gap = '5px';
                container.style.cursor = 'pointer';

                // Add the text content
                const text = document.createElement('span');
                text.textContent = header.textContent;

                // Add the sort indicator
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.textContent = ' ↕';
                indicator.style.userSelect = 'none'; // Prevent text selection

                // Clear and rebuild header content
                header.textContent = '';
                container.appendChild(text);
                container.appendChild(indicator);
                header.appendChild(container);

                // Update click handler to use new handleSort function
                header.addEventListener('click', () => handleSort(header));
            }
        });

        this.bindEvents();
        this.loadTickers();

        // Load TSLA data by default
        this.showHistoricalData('TSLA');
        
        // Update chart symbol display
        const chartSymbol = document.getElementById('chart-symbol');
        if (chartSymbol) {
            chartSymbol.textContent = 'TSLA';
        }

        // Update chart header
        const headerText = document.querySelector('#chart-container h2');
        if (headerText) {
            headerText.textContent = 'Displaying data for: TSLA';
            headerText.style.margin = '0';
            headerText.style.padding = '0';
        }

        // Assuming you have a portfolio overview section to modify
        const portfolioOverview = document.querySelector('.market-overview');
        if (portfolioOverview) {
            portfolioOverview.style.marginTop = '0'; // Remove top margin to eliminate space
            portfolioOverview.style.paddingTop = '0'; // Remove top padding if necessary
        }
    },

    bindEvents() {
        this.addBtn.addEventListener('click', () => {
            this.submitBtn.textContent = 'Add';
            delete this.submitBtn.dataset.editing;
            this.showForm();
        });
        this.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.submitBtn.dataset.editing) {
                this.updateTicker();
            } else {
                this.addTicker();
            }
        });
        this.cancelBtn.addEventListener('click', () => this.hideForm());
        
        // Event delegation for row clicks
        this.tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                const symbol = row.dataset.symbol;
                if (e.target.classList.contains('delete-btn')) {
                    this.deleteTicker(row);
                } else if (e.target.classList.contains('edit-btn')) {
                    this.editTicker(row);
                } else {
                    // Update chart symbol before any other operations
                    const chartSymbol = document.getElementById('chart-symbol');
                    if (chartSymbol) {
                        chartSymbol.textContent = symbol;
                    }
                    
                    // Check if we're in financial statements view
                    const tableContainer = document.querySelector('.financial-statements-table');
                    if (tableContainer && tableContainer.style.display !== 'none') {
                        // Get current statement type and fetch new data
                        const currentType = document.querySelector('.statement-type-btn.active')?.dataset.statementType || 'INCOME_STATEMENT';
                        fetchFinancialStatements(symbol, currentType)
                            .then(data => displayFinancialStatements(data))
                            .catch(error => console.error('Error updating financial statements:', error));
                    } else {
                        this.showHistoricalData(symbol);
                    }
                }
            }
        });

        // Add this near your other event listeners
        document.addEventListener('DOMContentLoaded', function() {
            const analysisItems = document.querySelectorAll('.analysis-item');
            
            analysisItems.forEach(item => {
                item.addEventListener('click', async function() {
                    const analysisType = this.getAttribute('data-analysis');
                    const symbol = document.getElementById('chart-symbol').textContent;
                    
                    if (analysisType === 'financial-statements') {
                        // Remove the selector check and directly fetch income statement data
                        try {
                            const data = await fetchFinancialStatements(symbol, 'INCOME_STATEMENT');
                            displayFinancialStatements(data);
                        } catch (error) {
                            console.error('Error fetching financial statements:', error);
                        }
                    }
                    // ... handle other analysis types ...
                });
            });
        });
    },

    showForm() {
        this.form.style.display = 'block';
        this.addBtn.style.display = 'none';
        
        // Add search results container if it doesn't exist
        if (!document.getElementById('ticker-search-results')) {
            const searchResults = document.createElement('div');
            searchResults.id = 'ticker-search-results';
            searchResults.className = 'search-results';
            this.form.appendChild(searchResults);
        }

        // Add input event listener for search
        const symbolInput = document.getElementById('ticker-symbol');
        symbolInput.addEventListener('input', this.debounce(this.searchTickers.bind(this), 300));
    },

    hideForm() {
        this.form.style.display = 'none';
        this.addBtn.style.display = 'block';
        this.clearForm();
    },

    clearForm() {
        document.getElementById('ticker-symbol').value = '';
        document.getElementById('shares').value = '';
        document.getElementById('cost-basis').value = '';
    },

    addTicker() {
        const symbol = document.getElementById('ticker-symbol').value.toUpperCase().trim();
        const shares = parseFloat(document.getElementById('shares').value);
        const costBasis = parseFloat(document.getElementById('cost-basis').value);

        if (!symbol || isNaN(shares) || isNaN(costBasis)) {
            alert('Please fill in all fields with valid values');
            return;
        }

        const ticker = { symbol, shares, costBasis };
        const tickers = this.getTickers();
        
        if (tickers.some(t => t.symbol === symbol)) {
            alert('This ticker symbol already exists in your portfolio');
            return;
        }

        tickers.push(ticker);
        localStorage.setItem('portfolioTickers', JSON.stringify(tickers));

        this.addTickerRow(ticker);
        this.hideForm();
        this.updateTickerPrice(ticker.symbol);
    },

    deleteTicker(row) {
        const symbol = row.dataset.symbol;
        const tickers = this.getTickers().filter(t => t.symbol !== symbol);
        localStorage.setItem('portfolioTickers', JSON.stringify(tickers));
        row.remove();
        this.updatePortfolioSummary();
    },

    getTickers() {
        return JSON.parse(localStorage.getItem('portfolioTickers') || '[]');
    },

    loadTickers() {
        const tickers = this.getTickers();
        this.tbody.innerHTML = '';
        tickers.forEach(ticker => this.addTickerRow(ticker));
        this.updateAllPrices();
    },

    addTickerRow(ticker) {
        const row = document.createElement('tr');
        row.className = 'ticker-row';
        row.dataset.symbol = ticker.symbol;
        row.dataset.shares = ticker.shares;
        row.dataset.costBasis = ticker.costBasis;
        
        row.innerHTML = `
            <td data-column="symbol" style="text-align: center">${ticker.symbol}</td>
            <td data-column="shares" style="text-align: center">${ticker.shares}</td>
            <td data-column="price" class="current-price" style="text-align: center">$0.00</td>
            <td data-column="change" class="change" style="text-align: center">-</td>
            <td data-column="marketValue" class="market-value" style="text-align: center">$0.00</td>
            <td data-column="pnl" class="pnl" style="text-align: center">$0.00</td>
            <td data-column="actions" style="text-align: center">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </td>
        `;
        
        this.tbody.appendChild(row);
    },

    async updateTickerPrice(symbol) {
        try {
            // Try stock endpoint first
            let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${config.API_KEY}`;
            let response = await fetch(url);
            let data = await response.json();
            
            // If no valid stock data, try crypto endpoint
            if (!data['Time Series (5min)']) {
                url = `https://www.alphavantage.co/query?function=CRYPTO_INTRADAY&symbol=${symbol}&market=USD&interval=5min&apikey=${config.API_KEY}`;
                response = await fetch(url);
                data = await response.json();
                
                // Process crypto data
                const timeSeries = data['Time Series Crypto (5min)'];
                if (timeSeries) {
                    const latestTime = Object.keys(timeSeries)[0];
                    const latestData = timeSeries[latestTime];
                    const priceData = {
                        price: parseFloat(latestData['4. close']),
                        change: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['1. open'])) * 100
                    };
                    this.updateTickerRow(symbol, priceData);
                    this.updatePortfolioSummary();
                    return;
                }
            } else {
                // Process stock data
                const timeSeries = data['Time Series (5min)'];
                const latestTime = Object.keys(timeSeries)[0];
                const latestData = timeSeries[latestTime];
                const priceData = {
                    price: parseFloat(latestData['4. close']),
                    change: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['1. open'])) * 100
                };
                this.updateTickerRow(symbol, priceData);
                this.updatePortfolioSummary();
                return;
            }
            
            throw new Error('Invalid symbol or no data available');
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            this.markTickerError(symbol);
        }
    },

    async updateAllPrices() {
        const tickers = this.getTickers();
        for (const ticker of tickers) {
            await this.updateTickerPrice(ticker.symbol);
            // Add a small delay between requests to avoid API rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    },

    updateTickerRow(symbol, priceData) {
        const row = document.querySelector(`tr[data-symbol="${symbol}"]`);
        if (!row) return;

        const shares = parseFloat(row.dataset.shares);
        const costBasis = parseFloat(row.dataset.costBasis);
        const marketValue = shares * priceData.price;
        const pnl = marketValue - (shares * costBasis);
        const pnlPercent = ((priceData.price - costBasis) / costBasis) * 100;

        row.querySelector('.current-price').textContent = `$${priceData.price.toFixed(2)}`;
        row.querySelector('.change').textContent = `${pnlPercent >= 0 ? '+' : ''}${Math.abs(pnlPercent).toFixed(2)}%`;
        row.querySelector('.market-value').textContent = `$${marketValue.toFixed(2)}`;
        
        // Update P/L with dynamic color and $ prefix
        const pnlElement = row.querySelector('.pnl');
        pnlElement.textContent = `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
        pnlElement.className = `pnl ${pnl >= 0 ? 'positive' : 'negative'}`;

        // Add color classes
        row.querySelector('.change').className = `change ${pnlPercent >= 0 ? 'positive' : 'negative'}`;
    },

    updatePortfolioSummary() {
        let totalValue = 0;
        let totalCost = 0;
        let totalChange = 0;

        const rows = document.querySelectorAll('.ticker-row');
        
        rows.forEach(row => {
            const shares = parseFloat(row.dataset.shares);
            const costBasis = parseFloat(row.dataset.costBasis);
            const currentPriceText = row.querySelector('.current-price').textContent.replace('$', '');
            const currentPrice = parseFloat(currentPriceText);
            
            if (!isNaN(currentPrice)) {
                const positionValue = shares * currentPrice;
                const positionCost = shares * costBasis;
                const pnl = positionValue - positionCost;
                
                totalValue += positionValue;
                totalCost += positionCost;
                totalChange += pnl;
            }
        });

        const totalReturn = totalValue - totalCost;
        const totalReturnPercent = totalCost > 0 ? ((totalReturn) / totalCost) * 100 : 0;

        // Update total portfolio value without $ prefix (it's added in HTML)
        const portfolioValueElement = document.getElementById('total-portfolio-value');
        if (portfolioValueElement) {
            portfolioValueElement.textContent = totalValue.toFixed(2);
        }
        
        // Update total change with dynamic $ sign and color
        const totalChangeElement = document.getElementById('total-change-value');
        if (totalChangeElement) {
            totalChangeElement.textContent = `${totalChange >= 0 ? '+' : ''}$${Math.abs(totalChange).toFixed(2)}`;
            totalChangeElement.className = totalChange >= 0 ? 'positive' : 'negative';
        }
        
        // Update total return with dynamic % sign and color
        const totalReturnElement = document.getElementById('total-return-value');
        if (totalReturnElement) {
            totalReturnElement.textContent = `${totalReturnPercent >= 0 ? '+' : ''}${Math.abs(totalReturnPercent).toFixed(2)}%`;
            totalReturnElement.className = totalReturnPercent >= 0 ? 'positive' : 'negative';
        }
    },

    markTickerError(symbol) {
        const row = document.querySelector(`tr[data-symbol="${symbol}"]`);
        if (!row) return;
        
        row.querySelector('.current-price').textContent = 'Error';
        row.querySelector('.change').textContent = '-';
        row.querySelector('.market-value').textContent = '-';
        row.querySelector('.pnl').textContent = '-';
    },

    async showHistoricalData(symbol) {
        // Update the chart symbol first
        const chartSymbol = document.getElementById('chart-symbol');
        if (chartSymbol) {
            chartSymbol.textContent = symbol;
        }

        const headerText = document.querySelector('#chart-container h2');
        if (headerText) {
            headerText.textContent = `Displaying data for: ${symbol}`;
            headerText.style.margin = '0';
            headerText.style.padding = '0';
        }

        try {
            // Try stock endpoint first
            let url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${config.API_KEY}&outputsize=full`;
            let response = await fetch(url);
            let data = await response.json();
            
            let historicalData;
            
            // If no valid stock data, try crypto endpoint
            if (!data['Time Series (Daily)']) {
                url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${config.API_KEY}&outputsize=full`;
                response = await fetch(url);
                data = await response.json();
                
                if (data['Time Series (Digital Currency Daily)']) {
                    historicalData = Object.entries(data['Time Series (Digital Currency Daily)'])
                        .map(([date, values]) => ({
                            date: new Date(date),
                            close: parseFloat(values['4a. close (USD)'])
                        }));
                }
            } else {
                // Process stock data using the adjusted close price
                historicalData = Object.entries(data['Time Series (Daily)'])
                    .map(([date, values]) => {
                        // Use the adjusted close price which accounts for splits and dividends
                        const adjustedClose = parseFloat(values['5. adjusted close']);
                        const splitCoefficient = parseFloat(values['8. split coefficient']);
                        
                        return {
                            date: new Date(date),
                            close: adjustedClose,
                            splitCoefficient: splitCoefficient
                        };
                    })
                    .sort((a, b) => a.date - b.date); // Sort by date ascending

                // Log some sample data points to verify adjustments
                console.log('Sample of processed data:', historicalData.slice(0, 5));
            }

            if (historicalData && historicalData.length > 0) {
                const minDate = new Date(Math.min(...historicalData.map(d => d.date)));
                const maxDate = new Date(Math.max(...historicalData.map(d => d.date)));

                // Move the log button to the right of expand button
                const chartControls = document.querySelector('.chart-controls');
                const expandBtn = document.getElementById('chart-expand');
                const logButton = document.getElementById('log-button');
                
                if (expandBtn && logButton) {
                    // Remove both buttons
                    expandBtn.remove();
                    logButton.remove();
                    
                    // Re-add them in the desired order
                    chartControls.appendChild(logButton);
                    chartControls.appendChild(expandBtn);
                }

                this.displayHistoricalChart(symbol, historicalData.reverse(), minDate, maxDate);
                
                const timeSeriesData = data['Time Series (Daily)'] || data['Time Series (Digital Currency Daily)'];
                await setupChartControls(symbol, timeSeriesData);
            } else {
                throw new Error('No valid data received');
            }
        } catch (error) {
            console.error('Error fetching historical data:', error);
            const canvas = document.querySelector('#chart-container canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading historical data', canvas.width/2, canvas.height/2);
        }

        // Update news feed with selected symbol
        await updateNewsFeed(symbol);

        // Add financial statements button if it doesn't exist
        const dataAnalysisSection = document.querySelector('.data-analysis-section');
        if (dataAnalysisSection) {
            let financialBtn = document.getElementById('financial-statements-btn');
            if (!financialBtn) {
                financialBtn = document.createElement('button');
                financialBtn.id = 'financial-statements-btn';
                financialBtn.className = 'analysis-btn';
                financialBtn.innerHTML = `
                    <span>Financial Statements</span>
                `;
                dataAnalysisSection.appendChild(financialBtn);

                // Add click handler
                financialBtn.addEventListener('click', async () => {
                    const symbol = document.getElementById('chart-symbol').textContent;
                    if (!symbol) return;
                    
                    try {
                        const data = await fetchFinancialStatements(symbol, 'INCOME_STATEMENT');
                        displayFinancialStatements(data);
                    } catch (error) {
                        console.error('Error fetching financial statements:', error);
                    }
                });
            }
        }
    },

    async displayHistoricalChart(symbol, data, minDate, maxDate) {
        const canvas = document.querySelector('#chart-container canvas');
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // Reset active states of indicator buttons when changing tickers
        const maButton = document.getElementById('moving-averages-btn');
        const bbButton = document.getElementById('bollinger-bands-btn');
        if (maButton) maButton.classList.remove('active');
        if (bbButton) bbButton.classList.remove('active');

        // Keep existing candlestick toggle button
        let chartTypeButton = document.getElementById('chart-type-toggle');
        if (!chartTypeButton) {
            chartTypeButton = document.createElement('button');
            chartTypeButton.id = 'chart-type-toggle';
            chartTypeButton.className = 'chart-control-btn';
            chartTypeButton.style.border = 'none';
            chartTypeButton.innerHTML = `<img src="static/images/candlestick.png" alt="Toggle Candlestick" width="16" height="16">`;
            document.querySelector('.chart-controls').appendChild(chartTypeButton);
            
            // Store the current chart type
            canvas.dataset.chartType = 'line';
            
            chartTypeButton.addEventListener('click', () => {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    const newType = canvas.dataset.chartType === 'line' ? 'candlestick' : 'line';
                    canvas.dataset.chartType = newType;
                    this.displayHistoricalChart(symbol, data, minDate, maxDate);
                    
                    // Change button color based on selection
                    if (newType === 'candlestick') {
                        chartTypeButton.style.backgroundColor = '#00ff00';
                    } else {
                        chartTypeButton.style.backgroundColor = '';
                    }
                }
            });
        }

        // Add click handler to the existing Moving Averages button in right panel
        if (maButton) {
            // Remove old event listeners
            maButton.replaceWith(maButton.cloneNode(true));
            const newMaButton = document.getElementById('moving-averages-btn');
            
            newMaButton.addEventListener('click', async () => {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    const hasMA = chart.data.datasets.some(ds => ds.label?.includes('EMA'));
                    if (hasMA) {
                        // Remove MAs
                        chart.data.datasets = chart.data.datasets.filter(ds => !ds.label?.includes('EMA'));
                        newMaButton.classList.remove('active');
                    } else {
                        // Add MAs
                        await addMovingAverages(symbol, chart);
                        newMaButton.classList.add('active'); // Turn button green
                    }
                    chart.update();
                }
            });
        }

        // Add click handler to the existing Bollinger Bands button in right panel
        if (bbButton) {
            // Remove old event listeners
            bbButton.replaceWith(bbButton.cloneNode(true));
            const newBbButton = document.getElementById('bollinger-bands-btn');
            
            newBbButton.addEventListener('click', async () => {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    const hasBBands = chart.data.datasets.some(ds => ds.label?.includes('BBand'));
                    if (hasBBands) {
                        // Remove BBands
                        chart.data.datasets = chart.data.datasets.filter(ds => !ds.label?.includes('BBand'));
                        newBbButton.classList.remove('active');
                    } else {
                        // Add BBands
                        await addBollingerBands(symbol, chart);
                        newBbButton.classList.add('active');
                    }
                    chart.update();
                }
            });
        }

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.08)');
        // gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        const isLineChart = canvas.dataset.chartType === 'line';

        // Prepare dataset based on chart type
        const dataset = isLineChart ? {
            data: data.map(d => d.close),
            fill: true,
            backgroundColor: gradient,
            // backgroundColor: 'linear-gradient(180deg, red, yellow)',
            borderColor: '#cecece', //#00ff00
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00ff00',
            pointHoverBorderColor: '#ffffff'
        } : {
            data: data.map(d => ({
                x: d.date,
                o: d.open || d.close,
                h: d.high || d.close,
                l: d.low || d.close,
                c: d.close
            })),
            color: {
                up: '#00ff00',
                down: '#ff0000',
                unchanged: '#999999',
            }
        };

        const chartOptions = {
            type: isLineChart ? 'line' : 'candlestick',
            data: {
                labels: data.map(d => d.date),
                datasets: [dataset]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    loop: (context) => context.active
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                if (isLineChart) {
                                    return `Price: $${context.parsed.y.toFixed(2)}`;
                                } else {
                                    const point = context.raw;
                                    return [
                                        `Open: $${point.o.toFixed(2)}`,
                                        `High: $${point.h.toFixed(2)}`,
                                        `Low: $${point.l.toFixed(2)}`,
                                        `Close: $${point.c.toFixed(2)}`
                                    ];
                                }
                            },
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            threshold: 10,
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(0,255,0,0.1)',
                                borderColor: 'rgba(0,255,0,0.3)',
                                borderWidth: 1
                            },
                            onPan: function(ctx) {
                                const chart = ctx.chart;
                                if (chart) {
                                    // Set a flag indicating manual interaction
                                    chart.isManuallyPanned = true;
                                    // Store the current view
                                    chart.userXMin = chart.scales.x.min;
                                    chart.userXMax = chart.scales.x.max;
                                }
                            }
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(0,255,0,0.1)',
                                borderColor: 'rgba(0,255,0,0.3)',
                                borderWidth: 1,
                                threshold: 10
                            },
                            onZoom: function(ctx) {
                                const chart = ctx.chart;
                                if (chart) {
                                    // Set a flag indicating manual interaction
                                    chart.isManuallyZoomed = true;
                                    // Store the current view
                                    chart.userXMin = chart.scales.x.min;
                                    chart.userXMax = chart.scales.x.max;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM D, YYYY',
                            displayFormats: {
                                day: 'MMM D',
                                week: 'MMM D',
                                month: 'MMM YYYY'
                            }
                        },
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10
                        },
                        display: true,
                        position: 'bottom',
                        afterSetDimensions: function(scale) {
                            const chart = scale.chart;
                            if (chart && (chart.isManuallyPanned || chart.isManuallyZoomed)) {
                                scale.min = chart.userXMin;
                                scale.max = chart.userXMax;
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            callback: function(value) {
                                return '$' + value;
                            }
                        },
                        position: 'right'
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                    axis: 'x'
                },
                hover: {
                    mode: 'index',
                    intersect: false
                }
            }
        };

        new Chart(ctx, chartOptions);

        // Add reset zoom button if it doesn't exist
        let resetButton = document.getElementById('reset-zoom');
        if (!resetButton) {
            resetButton = document.createElement('button');
            resetButton.id = 'reset-zoom';
            resetButton.className = 'chart-control-btn';
            resetButton.textContent = 'Reset';
            document.querySelector('.chart-controls').appendChild(resetButton);
            
            resetButton.addEventListener('click', () => {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    chart.resetZoom();
                }
            });
        }
    },

    createChart(ctx, data) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    data: data.map(d => d.close),
                    fill: true,
                    backgroundColor: this.getGradient(ctx),
                    borderColor: '#00ff00',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            modifierKey: null,
                        },
                        zoom: {
                            enabled: true,
                            mode: 'xy',
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(0,255,0,0.1)',
                                borderColor: 'rgba(0,255,0,0.3)',
                                borderWidth: 1
                            },
                            wheel: { enabled: false },
                            pinch: { enabled: true }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                        }
                    },
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });
    },

    editTicker(row) {
        const symbol = row.dataset.symbol;
        const shares = row.dataset.shares;
        const costBasis = row.dataset.costBasis;

        // Populate the form with existing values
        document.getElementById('ticker-symbol').value = symbol;
        document.getElementById('shares').value = shares;
        document.getElementById('cost-basis').value = costBasis;

        // Change the button text to "Update"
        this.submitBtn.textContent = 'Update';
        this.submitBtn.dataset.editing = 'true'; // Set a flag to indicate editing

        this.showForm(); // Show the form to edit
    },

    updateTicker() {
        const symbol = document.getElementById('ticker-symbol').value.toUpperCase().trim();
        const shares = parseFloat(document.getElementById('shares').value);
        const costBasis = parseFloat(document.getElementById('cost-basis').value);

        if (!symbol || isNaN(shares) || isNaN(costBasis)) {
            alert('Please fill in all fields with valid values');
            return;
        }

        const tickers = this.getTickers();
        const existingTickerIndex = tickers.findIndex(t => t.symbol === symbol);

        if (existingTickerIndex === -1) {
            alert('This ticker symbol does not exist in your portfolio');
            return;
        }

        // Update the existing ticker
        tickers[existingTickerIndex].shares = shares;
        tickers[existingTickerIndex].costBasis = costBasis;
        localStorage.setItem('portfolioTickers', JSON.stringify(tickers));

        this.loadTickers(); // Reload tickers to reflect changes
        this.hideForm();
    },

    async initializeMarketOverview() {
        try {
            const marketOverview = document.querySelector('.market-overview');
            if (marketOverview) {
                marketOverview.style.overflowX = 'hidden';
                marketOverview.style.display = 'flex';
                marketOverview.style.justifyContent = 'space-between';
                marketOverview.style.gap = '10px';
                marketOverview.style.width = '100%';
            }

            // Fetch all indices simultaneously
            await Promise.all([
                this.fetchIndexData('SPY', 'sp500'),     // S&P 500 ETF
                this.fetchIndexData('DIA', 'dow'),       // Dow Jones ETF
                this.fetchIndexData('QQQ', 'nasdaq'),    // NASDAQ ETF
                this.fetchIndexData('VXX', 'vix')        // VIX ETF
            ]);
        } catch (error) {
            console.error('Error initializing market overview:', error);
        }
    },

    async fetchIndexData(symbol, elementId) {
        try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
                const quote = data['Global Quote'];
                const price = parseFloat(quote['05. price']).toFixed(2);
                const changePercent = parseFloat(quote['10. change percent']);

                const valueElement = document.getElementById(elementId);
                if (valueElement) {
                    valueElement.innerHTML = `
                        $${price}
                        <span class="${changePercent >= 0 ? 'positive' : 'negative'}">
                            ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
                        </span>
                    `;
                    valueElement.classList.remove('loading');
                }
            } else {
                throw new Error(`No valid quote data for ${symbol}`);
            }
        } catch (error) {
            console.error(`Error fetching index data for ${symbol}:`, error);
            const element = document.getElementById(elementId);
            if (element) {
                if (!element.innerHTML) {
                    element.textContent = 'Unable to load';
                }
                element.classList.remove('loading');
            }
        }
    },

    async fetchCryptoData(symbol, elementId) {
        try {
            const url = `https://www.alphavantage.co/query?function=CRYPTO_QUOTE&symbol=${symbol}&market=USD&apikey=${config.API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data['Crypto Rating (FCAS)']) {
                const price = parseFloat(data['Crypto Rating (FCAS)']['3. price']).toFixed(2);
                const changePercent = parseFloat(data['Crypto Rating (FCAS)']['5. change percent']).toFixed(2);

                // Update the DOM
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = `
                        <span class="price">$${price}</span>
                        <span class="change ${changePercent >= 0 ? 'positive' : 'negative'}">
                            ${changePercent >= 0 ? '+' : ''}${changePercent}%
                        </span>
                    `;
                }
            }
        } catch (error) {
            console.error(`Error fetching crypto data for ${symbol}:`, error);
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = 'Data unavailable';
            }
        }
    },

    startMarketDataRefresh() {
        // Initial load
        this.initializeMarketOverview();

        // Refresh every minute
        setInterval(() => {
            this.initializeMarketOverview();
        }, 60000); // 1 minute in milliseconds
    },

    async searchTickers(event) {
        const searchTerm = event.target.value.trim().toUpperCase();
        const resultsContainer = document.getElementById('ticker-search-results');
        
        if (searchTerm.length < 1) {
            resultsContainer.innerHTML = '';
            return;
        }

        try {
            // Fetch both stocks and cryptocurrencies
            const [stocksResponse, cryptoResponse] = await Promise.all([
                // Regular symbol search
                fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${searchTerm}&apikey=${config.API_KEY}`),
                // Cryptocurrency list
                fetch(`https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_LIST&apikey=${config.API_KEY}`)
            ]);

            const stocksData = await stocksResponse.json();
            const cryptoData = await cryptoResponse.json();

            let results = [];

            // Process stock results
            if (stocksData.bestMatches) {
                const stockResults = stocksData.bestMatches
                    .filter(match => match['4. region'] !== 'Crypto')
                    .map(match => ({
                        symbol: match['1. symbol'],
                        name: match['2. name'],
                        type: match['4. region']
                    }));
                results.push(...stockResults);
            }

            // Process crypto results
            if (cryptoData) {
                const cryptoResults = Object.values(cryptoData)
                    .filter(crypto => 
                        crypto.currency_name?.toUpperCase().includes(searchTerm) ||
                        crypto.currency_code?.toUpperCase().includes(searchTerm)
                    )
                    .map(crypto => ({
                        symbol: crypto.currency_code,
                        name: crypto.currency_name,
                        type: 'Crypto'
                    }));
                results.push(...cryptoResults);
            }

            // Display combined results
            if (results.length > 0) {
                resultsContainer.innerHTML = results
                    .slice(0, 5)
                    .map(result => `
                        <div class="search-result" 
                            data-symbol="${result.symbol}" 
                            data-name="${result.name}">
                            <strong>${result.symbol}</strong> - ${result.name}
                            <span class="result-type">${result.type}</span>
                        </div>
                    `)
                    .join('');

                // Add click handlers to search results
                document.querySelectorAll('.search-result').forEach(result => {
                    result.addEventListener('click', () => {
                        document.getElementById('ticker-symbol').value = result.dataset.symbol;
                        resultsContainer.innerHTML = '';
                    });
                });
            } else {
                resultsContainer.innerHTML = '<div class="search-result">No matches found</div>';
            }
        } catch (error) {
            console.error('Error searching tickers:', error);
            resultsContainer.innerHTML = '<div class="search-error">Error searching for tickers</div>';
        }
    },

    // Utility function to debounce API calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    updateTableRow(ticker, data) {
        const row = document.querySelector(`tr[data-symbol="${ticker.symbol}"]`);
        if (!row) return;

        const priceCell = row.querySelector('.current-price');
        const changeCell = row.querySelector('.change');
        const marketValueCell = row.querySelector('.market-value');
        const pnlCell = row.querySelector('.pnl');

        priceCell.textContent = `$${data.price.toFixed(2)}`;
        changeCell.textContent = `${data.change >= 0 ? '+' : ''}${Math.abs(data.change).toFixed(2)}%`;
        changeCell.className = data.change >= 0 ? 'positive' : 'negative';

        const marketValue = data.price * ticker.shares;
        marketValueCell.textContent = `$${marketValue.toFixed(2)}`;

        const pl = marketValue - (ticker.shares * ticker.costBasis);
        const plSign = pl >= 0 ? '+' : '-';
        pnlCell.textContent = `${plSign}${Math.abs(pl).toFixed(2)}`;
        pnlCell.className = pl >= 0 ? 'positive' : 'negative';
    },

    async updateChart(symbol, range) {
        try {
            const historicalData = await this.fetchHistoricalData(symbol, range);
            const currentPrice = await this.fetchCurrentPrice(symbol);  // Make sure this exists
            
            // Add current price point to historical data
            const now = new Date();
            historicalData.push({
                date: now,
                value: currentPrice
            });

            // Sort data by date to ensure proper line connection
            historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

            const chartData = {
                labels: historicalData.map(data => data.date),
                datasets: [{
                    label: symbol,
                    data: historicalData.map(data => data.value),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    pointRadius: 0,  // Hide regular points
                    pointHoverRadius: 5,  // Show points on hover
                }]
            };

            // Add a visible point for the current price
            chartData.datasets[0].pointRadius = historicalData.map((_, index) => 
                index === historicalData.length - 1 ? 4 : 0  // Show point only for latest price
            );
            chartData.datasets[0].pointBackgroundColor = historicalData.map((_, index) => 
                index === historicalData.length - 1 ? 'rgb(75, 192, 192)' : 'transparent'
            );

            // Update the chart
            if (this.priceChart) {
                this.priceChart.data = chartData;
                this.priceChart.update();
            }
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    },

    initializeDataAnalysisButtons() {
        // Remove this entire function since we don't want the duplicate buttons
    },

    displayFinancialStatements(data) {
        const chartContainer = document.querySelector('#chart-container');
        const canvas = chartContainer.querySelector('canvas');
        const chartControls = document.querySelector('.chart-controls');
        const expandBtn = document.getElementById('chart-expand');
        const logButton = document.getElementById('log-button');
        
        // Store the original chart controls HTML to restore later
        if (!chartContainer.dataset.originalControls) {
            chartContainer.dataset.originalControls = chartControls.innerHTML;
        }
        
        // Get the current statement type from the button that triggered this
        const currentType = data.symbol ? 'INCOME_STATEMENT' : 
            document.querySelector('.statement-type-btn.active')?.dataset.statementType || 'INCOME_STATEMENT';
        
        // Create new controls for financial statements with similar styling to chart buttons
        chartControls.innerHTML = `
            <div class="statement-controls-container">
                <button id="back-to-chart" class="chart-control-btn" style="background-color: var(--green-color)">Back to Chart</button>
                <div class="statement-type-controls">
                    <button class="chart-control-btn statement-type-btn ${currentType === 'INCOME_STATEMENT' ? 'active' : ''}" 
                        data-statement-type="INCOME_STATEMENT" style="background-color: ${currentType === 'INCOME_STATEMENT' ? 'var(--green-color)' : ''}">Income Statement</button>
                    <button class="chart-control-btn statement-type-btn ${currentType === 'BALANCE_SHEET' ? 'active' : ''}" 
                        data-statement-type="BALANCE_SHEET" style="background-color: ${currentType === 'BALANCE_SHEET' ? 'var(--green-color)' : ''}">Balance Sheet</button>
                    <button class="chart-control-btn statement-type-btn ${currentType === 'CASH_FLOW' ? 'active' : ''}" 
                        data-statement-type="CASH_FLOW" style="background-color: ${currentType === 'CASH_FLOW' ? 'var(--green-color)' : ''}">Cash Flow</button>
                </div>
            </div>
        `;
        
        // Position expand button in top right corner
        expandBtn.style.position = 'absolute';
        expandBtn.style.right = '10px';
        expandBtn.style.top = '10px';
        chartControls.appendChild(expandBtn);

        // Hide the chart canvas when displaying the financial statements
        canvas.style.display = 'none';

        // Hide the log button when in table view
        if (logButton) {
            logButton.style.display = 'none';
        }

        // Create or get table container
        let tableContainer = chartContainer.querySelector('.financial-statements-table');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.className = 'financial-statements-table';
            chartContainer.appendChild(tableContainer);
        }

        // Clear existing content and show table container
        tableContainer.innerHTML = '';
        tableContainer.style.display = 'block';

        // Create table
        const table = document.createElement('table');
        table.id = 'statements-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Add metric column header
        headerRow.appendChild(createCell('th', 'Metric'));
        
        // Add year headers
        if (data.annualReports && data.annualReports.length > 0) {
            data.annualReports.forEach(report => {
                const year = new Date(report.fiscalDateEnding).getFullYear();
                headerRow.appendChild(createCell('th', year));
            });
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        
        if (data.annualReports && data.annualReports.length > 0) {
            const metrics = Object.keys(data.annualReports[0])
                .filter(key => key !== 'fiscalDateEnding');
            
            metrics.forEach(metric => {
                const row = document.createElement('tr');
                row.appendChild(createCell('td', formatMetricName(metric)));
                
                data.annualReports.forEach(report => {
                    row.appendChild(createCell('td', formatValue(report[metric])));
                });
                
                tbody.appendChild(row);
            });
        }

        table.appendChild(tbody);
        tableContainer.appendChild(table);

        // Add event listener for back button
        document.getElementById('back-to-chart').addEventListener('click', () => {
            // Get the current symbol before restoring controls
            const symbol = document.getElementById('chart-symbol').textContent;
            
            // Restore original controls and expand button position
            chartControls.innerHTML = chartContainer.dataset.originalControls;
            expandBtn.style.position = '';
            expandBtn.style.right = '';
            expandBtn.style.top = '';
            chartControls.appendChild(expandBtn);
            
            // Show chart and hide table
            canvas.style.display = 'block';
            tableContainer.style.display = 'none';
            
            // Show the log button again when returning to chart view
            if (logButton) {
                logButton.style.display = 'block';
                chartControls.appendChild(logButton);
            }

            // Show historical data for the current symbol
            portfolio.showHistoricalData(symbol);
        });

        // Add event listeners for statement type buttons
        document.querySelectorAll('.statement-type-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const symbol = document.getElementById('chart-symbol').textContent;
                if (!symbol) return;

                // Update active state and styling
                document.querySelectorAll('.statement-type-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = '';
                });
                button.classList.add('active');
                button.style.backgroundColor = 'var(--green-color)';

                try {
                    const data = await fetchFinancialStatements(symbol, button.dataset.statementType);
                    displayFinancialStatements(data);
                } catch (error) {
                    console.error('Error fetching financial statements:', error);
                }
            });
        });
    },

    createCell(type, content) {
        const cell = document.createElement(type);
        cell.textContent = content;
        return cell;
    },

    formatMetricName(metric) {
        return metric
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\b[A-Z]+\b/g, word => word.charAt(0) + word.slice(1).toLowerCase());
    },

    formatValue(value) {
        if (!value || value === 'None' || value === '0') return '-';
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        
        // Format large numbers with appropriate suffixes (K, M, B)
        if (Math.abs(num) >= 1e9) {
            return `$${(num / 1e9).toFixed(2)}B`;
        } else if (Math.abs(num) >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        } else if (Math.abs(num) >= 1e3) {
            return `$${(num / 1e3).toFixed(2)}K`;
        }
        return `$${num.toFixed(2)}`;
    },

    handleTickerClick(event) {
        const ticker = event.target.closest('.ticker');
        if (!ticker) return;
        
        const symbol = ticker.dataset.symbol;
        const tableContainer = document.querySelector('#chart-container table');
        
        // Check if we're in financial statements view
        if (tableContainer) {
            // Get the current statement type if we're already viewing statements
            const currentType = document.querySelector('.statement-type-btn.active')?.dataset.statementType || 'INCOME_STATEMENT';
            fetchFinancialStatements(symbol, currentType);
            return;
        }

        // Existing chart display logic
        displayChart(symbol);
    }
};

// Initialize the portfolio when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    portfolio.init();
    portfolio.startMarketDataRefresh();
    initializeFinancialStatements();
});

// Chart control functionality
document.addEventListener('DOMContentLoaded', () => {
    const chartControls = document.querySelector('.chart-controls');
    const scaleToggle = document.getElementById('scale-toggle');
    const expandBtn = document.getElementById('chart-expand');
    
    // Handle time range buttons
    chartControls.addEventListener('click', (e) => {
        if (e.target.classList.contains('range-btn')) {
            // Remove active class from all buttons
            document.querySelectorAll('.range-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            const range = e.target.dataset.range;
            // Only update time range when explicitly clicked
            if (!e.isTrusted || e.type !== 'click') return;
            updateChartTimeRange(range);
        }
    });

    // Handle logarithmic scale toggle
    scaleToggle.addEventListener('change', (e) => {
        const isLogarithmic = e.target.checked;
        updateChartScale(isLogarithmic); // You'll need to implement this function
    });

    // Handle expand button
    expandBtn.addEventListener('click', () => {
        const chartContainer = document.getElementById('chart-container');
        const isExpanded = chartContainer.classList.toggle('expanded');
        const tableContainer = chartContainer.querySelector('.financial-statements-table');

        if (isExpanded) {
            // Expand the chart/table container
            chartContainer.style.position = 'fixed';
            chartContainer.style.top = '0';
            chartContainer.style.left = '0';
            chartContainer.style.width = '100%';
            chartContainer.style.height = '100vh';
            chartContainer.style.zIndex = '1000';
            chartContainer.style.backgroundColor = '#000';
            chartContainer.style.padding = '20px';
            
            // If table is visible, adjust its styles for expanded view
            if (tableContainer && tableContainer.style.display !== 'none') {
                tableContainer.style.height = 'calc(100vh - 40px)'; // Account for padding
                tableContainer.style.overflow = 'auto';
                
                // Make the table take full width
                const table = tableContainer.querySelector('table');
                if (table) {
                    table.style.width = '100%';
                    table.style.maxWidth = 'none';
                }
            }
        } else {
            // Reset container styles
            chartContainer.style.position = '';
            chartContainer.style.top = '';
            chartContainer.style.left = '';
            chartContainer.style.width = '';
            chartContainer.style.height = '';
            chartContainer.style.zIndex = '';
            chartContainer.style.backgroundColor = '';
            chartContainer.style.padding = '';
            
            // Reset table styles
            if (tableContainer) {
                tableContainer.style.height = '';
                tableContainer.style.overflow = '';
                
                const table = tableContainer.querySelector('table');
                if (table) {
                    table.style.width = '';
                    table.style.maxWidth = '';
                }
            }
        }

        // Force chart resize after transition
        const canvas = chartContainer.querySelector('canvas');
        const chart = Chart.getChart(canvas);
        if (chart) {
            setTimeout(() => {
                chart.resize();
                chart.update('none');
            }, 100); // Small delay to ensure transition is complete
        }
    });
});

// These functions need to be implemented based on your chart library
function updateChartTimeRange(range) {
    // Update chart data based on selected time range
    // Example: fetch new data and update chart
    console.log(`Updating chart to ${range} range`);
}

// Add this function to handle logarithmic scale updates
function updateChartScale(isLogarithmic) {
    const chart = Chart.getChart(document.querySelector('#chart-container canvas'));
    if (chart) {
        chart.options.scales.y = {
            ...chart.options.scales.y,
            type: isLogarithmic ? 'logarithmic' : 'linear',
            grid: {
                color: '#333333'
            },
            ticks: {
                color: '#888888',
                callback: function(value) {
                    return '$' + value;
                }
            },
            position: 'right'
        };
        chart.update('none');
    }
}

async function setupChartControls(symbol, initialData) {
    const timeButtons = document.querySelectorAll('.range-btn');
    const scaleToggle = document.getElementById('scale-toggle');
    
    // Reset buttons
    timeButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.replaceWith(btn.cloneNode(true));
    });

    // Set default range (1M) only on initial load
    if (!Chart.getChart(document.querySelector('#chart-container canvas'))) {
        document.querySelector('[data-range="1M"]').classList.add('active');
    }
    
    // Add click handlers to new buttons
    document.querySelectorAll('.range-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const chart = Chart.getChart(document.querySelector('#chart-container canvas'));
            
            // Don't update the chart view if user has manually zoomed/panned
            if (!chart || chart.isZoomed) {
                // Only update the active button state
                timeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                return;
            }
            
            const range = button.dataset.range;
            await updateChartRange(symbol, range);
            
            // Update active state
            timeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Add reset zoom button functionality
    const resetButton = document.getElementById('reset-zoom');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const chart = Chart.getChart(document.querySelector('#chart-container canvas'));
            if (chart) {
                // Reset zoom level
                chart.resetZoom();
                
                // Clear interaction flags
                chart.isZoomed = false;
                chart.isManuallyPanned = false;
                chart.isManuallyZoomed = false;
                
                // Update the chart
                chart.update('none');
            }
        });
    }

    // Add zoom/pan tracking
    const chart = Chart.getChart(document.querySelector('#chart-container canvas'));
    if (chart) {
        chart.options.plugins.zoom.zoom.onZoom = () => {
            chart.isZoomed = true;
        };
        chart.options.plugins.zoom.pan.onPan = () => {
            chart.isZoomed = true;
        };
    }
}

async function updateChartRange(symbol, range) {
    try {
        const canvas = document.querySelector('#chart-container canvas');
        canvas.style.opacity = '0.5'; // Show loading state

        // Get the current chart instance
        const chart = Chart.getChart(canvas);
        
        // NEW: Check if user is currently interacting with the chart
        if (chart && (chart.dragStart || chart.pinchZoom || chart.isZooming)) {
            canvas.style.opacity = '1';
            return;
        }

        // Always use the adjusted daily data
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${config.API_KEY}&outputsize=full`;
        const response = await fetch(url);
        const result = await response.json();

        let data;
        if (result['Time Series (Daily)']) {
            data = processDailyData(result['Time Series (Daily)'], range);
        }

        if (data && data.length > 0) {
            if (chart) {
                // Update the chart with all adjusted data
                chart.data.labels = data.map(d => d.date);
                chart.data.datasets[0].data = data.map(d => d.close);

                // NEW: Only update range if not interacting with chart
                if (!chart.dragStart && !chart.pinchZoom && !chart.isZooming) {
                    const now = new Date();
                    const filterDate = new Date();
                    
                    switch (range) {
                        case '1W': filterDate.setDate(now.getDate() - 7); break;
                        case '1M': filterDate.setMonth(now.getMonth() - 1); break;
                        case '3M': filterDate.setMonth(now.getMonth() - 3); break;
                        case '1Y': filterDate.setFullYear(now.getFullYear() - 1); break;
                        case 'ALL': 
                            chart.options.scales.x.min = data[0].date;
                            chart.options.scales.x.max = data[data.length - 1].date;
                            break;
                        default: filterDate.setMonth(now.getMonth() - 1);
                    }

                    if (range !== 'ALL') {
                        chart.options.scales.x.min = filterDate;
                        chart.options.scales.x.max = now;
                    }
                }

                chart.update('none');
            }
        }

    } catch (error) {
        console.error('Error updating chart:', error);
    } finally {
        document.querySelector('#chart-container canvas').style.opacity = '1';
    }
}

function processDailyData(timeSeriesData, range) {
    // Convert all data first, using adjusted close prices
    const allData = Object.entries(timeSeriesData)
        .map(([date, values]) => ({
            date: new Date(date),
            close: parseFloat(values['5. adjusted close']) // Always use adjusted close
        }))
        .sort((a, b) => a.date - b.date);

    console.log('Processing daily data with adjusted prices:', {
        firstPrice: allData[0]?.close,
        lastPrice: allData[allData.length - 1]?.close
    });

    // Always return all data with adjusted prices
    return allData;
}

// Remove any duplicate event listeners
document.removeEventListener('DOMContentLoaded', setupChartControls);

// Assuming you have a method to fetch and display data
async function fetchAndDisplayData(symbol, range) {
    let url;
    switch (range) {
        case '1D':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${config.API_KEY}`;
            break;
        case '1W':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${symbol}&apikey=${config.API_KEY}`;
            break;
        case '1M':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=compact&apikey=${config.API_KEY}`;
            break;
        case '3M':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${config.API_KEY}`;
            break;
        case '1Y':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${config.API_KEY}`;
            break;
        case 'ALL':
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${config.API_KEY}`;
            break;
        default:
            url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${config.API_KEY}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Log the data to check its structure
        console.log('Fetched data:', data);

        // Check if the expected data structure is present
        if (!data['Time Series (Daily)'] && !data['Time Series (5min)']) {
            throw new Error('No valid data returned from API');
        }

        // Process and display the data here
        displayHistoricalChart(data); // Call your existing chart display function
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to fetch data. Please try again later.'); // User feedback
    }
}

// Set up event listeners for the buttons
const timeframeButtons = document.querySelectorAll('.chart-controls button');
timeframeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const range = button.dataset.range;
        const symbol = ''; // Replace with the actual symbol you want to use
        fetchAndDisplayData(symbol, range);

        // Update active button state
        timeframeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Show loading indicator
document.getElementById('loading').style.display = 'block';
// Hide loading indicator after data is fetched
document.getElementById('loading').style.display = 'none';

async function updateNewsFeed(symbol) {
    const newsContainer = document.getElementById('news-feed');
    if (!newsContainer) return;

    try {
        newsContainer.innerHTML = '<div class="loading">Loading news...</div>';
        
        // Log the API key (length only, for security)
        console.log('XAI_KEY length:', config.XAI_KEY?.length);
        
        const response = await fetch('https://api.xai.ax/v1/chat/completions', {  // Updated URL to api.xai.ax
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.XAI_KEY}`
            },
            body: JSON.stringify({
                messages: [{
                    role: 'user',
                    content: 'What are the top 10 trending stories right now?'
                }],
                model: 'xai-chat-alpha'  // Added model specification
            })
        });

        // Log response status
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);  // Log the response data
        
        if (data.choices && data.choices[0]?.message?.content) {
            // Split the response into individual stories
            const stories = data.choices[0].message.content
                .split(/\d+\./)  // Split on numbered items
                .filter(story => story.trim())  // Remove empty items
                .slice(0, 5);  // Take first 5 stories
            
            const newsHTML = stories
                .map(story => `
                    <div class="news-item">
                        <div class="news-title">
                            ${story.trim()}
                        </div>
                    </div>
                `).join('');
            
            newsContainer.innerHTML = `
                <div class="news-content">
                    ${newsHTML}
                </div>`;
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = `<div class="error">Failed to load news: ${error.message}</div>`;
    }
}

async function addMovingAverages(symbol, chart) {
    try {
        // Fetch daily adjusted data for calculating MAs
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${config.API_KEY}&outputsize=full`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data['Time Series (Daily)']) {
            throw new Error('No data available for moving averages');
        }

        // Convert data to array and sort by date
        const timeSeriesData = Object.entries(data['Time Series (Daily)'])
            .map(([date, values]) => ({
                date: new Date(date),
                close: parseFloat(values['5. adjusted close'])
            }))
            .sort((a, b) => a.date - b.date);

        // Calculate EMAs for different periods
        const ema20 = calculateEMA(timeSeriesData, 20);
        const ema50 = calculateEMA(timeSeriesData, 50);
        const ema200 = calculateEMA(timeSeriesData, 200);

        // Add EMAs to chart
        chart.data.datasets.push(
            {
                label: '20 EMA',
                data: ema20,
                borderColor: '#00ff00',
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            },
            {
                label: '50 EMA',
                data: ema50,
                borderColor: '#ff9900',
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            },
            {
                label: '200 EMA',
                data: ema200,
                borderColor: '#ff0000',
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            }
        );

        chart.update('none');

        // Add active class to the button
        const maButton = document.getElementById('moving-averages-btn');
        if (maButton) {
            maButton.classList.add('active');
            maButton.style.backgroundColor = 'var(--accent-color)';
        }
    } catch (error) {
        console.error('Error adding moving averages:', error);
    }
}

function calculateEMA(data, period) {
    const multiplier = 2 / (period + 1);
    let ema = [];
    
    // Initialize EMA with SMA for first period
    let sma = data.slice(0, period).reduce((sum, price) => sum + price.close, 0) / period;
    ema.push({ x: data[period - 1].date, y: sma });
    
    // Calculate EMA for remaining periods
    for (let i = period; i < data.length; i++) {
        const currentPrice = data[i].close;
        const previousEMA = ema[ema.length - 1].y;
        const currentEMA = (currentPrice - previousEMA) * multiplier + previousEMA;
        ema.push({ x: data[i].date, y: currentEMA });
    }
    
    return ema;
}

function initializeFinancialStatements() {
    const financialBtn = document.getElementById('financial-statements-btn');
    if (financialBtn) {
        financialBtn.addEventListener('click', async () => {
            const symbol = document.getElementById('chart-symbol').textContent;
            if (!symbol) return;

            try {
                const data = await fetchFinancialStatements(symbol, 'INCOME_STATEMENT');
                displayFinancialStatements(data);
            } catch (error) {
                console.error('Error fetching financial statements:', error);
            }
        });
    }
}

async function fetchFinancialStatements(symbol, statementType) {
    try {
        console.log('Fetching data for:', symbol, statementType);
        const url = `https://www.alphavantage.co/query?function=${statementType}&symbol=${symbol}&apikey=${config.API_KEY}`;
        console.log('API URL:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.Note) {
            throw new Error('API call frequency limit reached. Please try again later.');
        }
        
        if (!data.annualReports || data.annualReports.length === 0) {
            throw new Error('No financial data available for this symbol');
        }
        
        return data;
    } catch (error) {
        console.error('Error in fetchFinancialStatements:', error);
        throw error;
    }
}

function displayFinancialStatements(data) {
    const chartContainer = document.querySelector('#chart-container');
    const canvas = chartContainer.querySelector('canvas');
    const chartControls = document.querySelector('.chart-controls');
    const expandBtn = document.getElementById('chart-expand');
    const logButton = document.getElementById('log-button');
    
    // Store the original chart controls HTML to restore later
    if (!chartContainer.dataset.originalControls) {
        chartContainer.dataset.originalControls = chartControls.innerHTML;
    }
    
    // Get the current statement type from the button that triggered this
    const currentType = data.symbol ? 'INCOME_STATEMENT' : 
        document.querySelector('.statement-type-btn.active')?.dataset.statementType || 'INCOME_STATEMENT';
    
    // Create new controls for financial statements with similar styling to chart buttons
    chartControls.innerHTML = `
        <div class="statement-controls-container">
            <button id="back-to-chart" class="chart-control-btn" style="background-color: var(--green-color)">Back to Chart</button>
            <div class="statement-type-controls">
                <button class="chart-control-btn statement-type-btn ${currentType === 'INCOME_STATEMENT' ? 'active' : ''}" 
                    data-statement-type="INCOME_STATEMENT" style="background-color: ${currentType === 'INCOME_STATEMENT' ? 'var(--green-color)' : ''}">Income Statement</button>
                <button class="chart-control-btn statement-type-btn ${currentType === 'BALANCE_SHEET' ? 'active' : ''}" 
                    data-statement-type="BALANCE_SHEET" style="background-color: ${currentType === 'BALANCE_SHEET' ? 'var(--green-color)' : ''}">Balance Sheet</button>
                <button class="chart-control-btn statement-type-btn ${currentType === 'CASH_FLOW' ? 'active' : ''}" 
                    data-statement-type="CASH_FLOW" style="background-color: ${currentType === 'CASH_FLOW' ? 'var(--green-color)' : ''}">Cash Flow</button>
            </div>
        </div>
    `;
    
    // Position expand button in top right corner
    expandBtn.style.position = 'absolute';
    expandBtn.style.right = '10px';
    expandBtn.style.top = '10px';
    chartControls.appendChild(expandBtn);

    // Hide the chart canvas when displaying the financial statements
    canvas.style.display = 'none';

    // Hide the log button when in table view
    if (logButton) {
        logButton.style.display = 'none';
    }

    // Create or get table container
    let tableContainer = chartContainer.querySelector('.financial-statements-table');
    if (!tableContainer) {
        tableContainer = document.createElement('div');
        tableContainer.className = 'financial-statements-table';
        chartContainer.appendChild(tableContainer);
    }

    // Clear existing content and show table container
    tableContainer.innerHTML = '';
    tableContainer.style.display = 'block';

    // Create table
    const table = document.createElement('table');
    table.id = 'statements-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add metric column header
    headerRow.appendChild(createCell('th', 'Metric'));
    
    // Add year headers
    if (data.annualReports && data.annualReports.length > 0) {
        data.annualReports.forEach(report => {
            const year = new Date(report.fiscalDateEnding).getFullYear();
            headerRow.appendChild(createCell('th', year));
        });
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    
    if (data.annualReports && data.annualReports.length > 0) {
        const metrics = Object.keys(data.annualReports[0])
            .filter(key => key !== 'fiscalDateEnding');
        
        metrics.forEach(metric => {
            const row = document.createElement('tr');
            row.appendChild(createCell('td', formatMetricName(metric)));
            
            data.annualReports.forEach(report => {
                row.appendChild(createCell('td', formatValue(report[metric])));
            });
            
            tbody.appendChild(row);
        });
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    // Add event listener for back button
    document.getElementById('back-to-chart').addEventListener('click', () => {
        // Get the current symbol before restoring controls
        const symbol = document.getElementById('chart-symbol').textContent;
        
        // Restore original controls and expand button position
        chartControls.innerHTML = chartContainer.dataset.originalControls;
        expandBtn.style.position = '';
        expandBtn.style.right = '';
        expandBtn.style.top = '';
        chartControls.appendChild(expandBtn);
        
        // Show chart and hide table
        canvas.style.display = 'block';
        tableContainer.style.display = 'none';
        
        // Show the log button again when returning to chart view
        if (logButton) {
            logButton.style.display = 'block';
            chartControls.appendChild(logButton);
        }

        // Show historical data for the current symbol
        portfolio.showHistoricalData(symbol);
    });

    // Add event listeners for statement type buttons
    document.querySelectorAll('.statement-type-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const symbol = document.getElementById('chart-symbol').textContent;
            if (!symbol) return;

            // Update active state and styling
            document.querySelectorAll('.statement-type-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.backgroundColor = '';
            });
            button.classList.add('active');
            button.style.backgroundColor = 'var(--green-color)';

            try {
                const data = await fetchFinancialStatements(symbol, button.dataset.statementType);
                displayFinancialStatements(data);
            } catch (error) {
                console.error('Error fetching financial statements:', error);
            }
        });
    });
}

function createCell(type, content) {
    const cell = document.createElement(type);
    cell.textContent = content;
    return cell;
}

function formatMetricName(metric) {
    return metric
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/\b[A-Z]+\b/g, word => word.charAt(0) + word.slice(1).toLowerCase());
}

function formatValue(value) {
    if (!value || value === 'None' || value === '0') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    // Format large numbers with appropriate suffixes (K, M, B)
    if (Math.abs(num) >= 1e9) {
        return `$${(num / 1e9).toFixed(2)}B`;
    } else if (Math.abs(num) >= 1e6) {
        return `$${(num / 1e6).toFixed(2)}M`;
    } else if (Math.abs(num) >= 1e3) {
        return `$${(num / 1e3).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
}

function handleTickerClick(event) {
    const ticker = event.target.closest('.ticker');
    if (!ticker) return;
    
    const symbol = ticker.dataset.symbol;
    const tableContainer = document.querySelector('#chart-container table');
    
    // Check if we're in financial statements view
    if (tableContainer) {
        // Get the current statement type if we're already viewing statements
        const currentType = document.querySelector('.statement-type-btn.active')?.dataset.statementType || 'INCOME_STATEMENT';
        fetchFinancialStatements(symbol, currentType);
        return;
    }

    // Existing chart display logic
    displayChart(symbol);
}


