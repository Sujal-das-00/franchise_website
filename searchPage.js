// Performance-optimized search page
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        itemsPerPage: 8,
        debounceDelay: 300,
        workerUrl: 'franchise-worker.js'
    };

    // State management
    const state = {
        allFranchises: [],
        filteredFranchises: [],
        currentPage: 1,
        isLoading: false,
        searchWorker: null,
        eventListeners: new Map(),
        originalOrder: [], // Store original order for reset functionality
        currentFilters: {
            industry: '',
            order: '',
            searchTerm: ''
        }
    };

    // Initialize application
    function init() {
        setupEventListeners();
        setupWebWorker();
        loadFranchises();
    }

    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Web Worker setup
    function setupWebWorker() {
        if (window.Worker) {
            state.searchWorker = new Worker(CONFIG.workerUrl);
            state.searchWorker.onmessage = handleWorkerMessage;
        }
    }

    function handleWorkerMessage(e) {
        const { type, data } = e.data;
        
        switch (type) {
            case 'filteredData':
                state.filteredFranchises = data;
                renderPage();
                break;
            case 'dataReady':
                console.log('Worker ready for processing');
                break;
        }
    }

    // DOM manipulation optimizations
    function createCardFragment(items) {
        const fragment = document.createDocumentFragment();
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-image-box">
                    <img src="${item.logo}" alt="${item.name}" loading="lazy">
                </div>
                <div class="category">${item.category}</div>
                <div class="card-title">${item.name}</div>
                
                <div class="stat-row">
                    <span>Average investment</span>
                    <span class="stat-value">${item.avgInvestment}</span>
                </div>
                <div class="stat-row">
                    <span>Minimum Investment</span>
                    <span class="stat-value">${item.minInvestment}</span>
                </div>
                <div class="stat-row">
                    <span>Franchise outlets</span>
                    <span class="stat-value">${item.outlets}</span>
                </div>

                <button class="btn-know-more" onclick="location.href='franchiseInfo.html?id=${item.id}'">Know More</button>
            `;
            fragment.appendChild(card);
        });
        
        return fragment;
    }

    // Main loading function with URL parameter support
    async function loadFranchises() {
        try {
            const response = await fetch('franchises.json');
            const data = await response.json();
            
            // Extract URL parameters for filtering
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('q');
            const industry = urlParams.get('industry');
            const order = urlParams.get('order');
            const category = urlParams.get('category');
            
            state.allFranchises = data;
            state.originalOrder = [...data]; // Store original order for reset functionality
            
            // Determine which filter to apply based on URL parameters
            let finalIndustry = industry || '';
            let finalSearchTerm = searchTerm || '';
            
            // If category parameter exists, use it to set the industry filter
            if (category && category.trim()) {
                finalIndustry = category;
            }
            
            if (state.searchWorker) {
                state.searchWorker.postMessage({
                    action: 'setFullData',
                    data: data
                });
                
                // Apply filters using worker
                state.searchWorker.postMessage({
                    action: 'filterData',
                    searchTerm: finalSearchTerm,
                    industry: finalIndustry,
                    order: order || ''
                });
            } else {
                // Use enhanced filtering and sorting
                applyFiltersAndSorting(finalSearchTerm, finalIndustry, order || '');
            }
            
            // Pre-fill form with URL parameters
            prefillFormWithParams(finalSearchTerm, finalIndustry, order);
            
        } catch (error) {
            console.error("Error loading JSON data:", error);
            showErrorMessage();
        }
    }

    // Enhanced filtering and sorting functions
    function applyFiltersAndSorting(searchTerm, industry, order) {
        // Start with all franchises
        let filteredData = [...state.allFranchises];
        
        // Store original order for reset functionality
        if (state.originalOrder.length === 0) {
            state.originalOrder = [...state.allFranchises];
        }
        
        // Apply search filter (case-insensitive)
        if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filteredData = filteredData.filter(item => {
                return (
                    (item.name || '').toLowerCase().includes(searchLower) ||
                    (item.category || '').toLowerCase().includes(searchLower) ||
                    (item.description || '').toLowerCase().includes(searchLower) ||
                    (item.avgInvestment || '').toLowerCase().includes(searchLower) ||
                    (item.minInvestment || '').toLowerCase().includes(searchLower) ||
                    (item.outlets || '').toLowerCase().includes(searchLower)
                );
            });
        }
        
        // Apply industry filter (case-insensitive match against category)
        if (industry && industry.trim()) {
            const industryLower = industry.toLowerCase();
            filteredData = filteredData.filter(item => {
                const category = (item.category || '').toLowerCase();
                return category.includes(industryLower);
            });
        }
        
        // Apply sorting
        if (order && order.trim()) {
            filteredData = applySorting(filteredData, order);
        } else {
            // If no sorting specified, maintain original order
            filteredData = maintainOriginalOrder(filteredData);
        }
        
        // Update current filters state
        state.currentFilters = {
            searchTerm: searchTerm,
            industry: industry,
            order: order
        };
        
        // Update filtered data and render
        state.filteredFranchises = filteredData;
        state.currentPage = 1; // Reset to first page
        renderPage();
    }
    
    function applySorting(data, order) {
        const sortedData = [...data];
        
        switch (order) {
            case "min-low":
                // Sort by Minimum Investment ascending
                sortedData.sort((a, b) => {
                    const aVal = extractNumericValue(a.minInvestment);
                    const bVal = extractNumericValue(b.minInvestment);
                    return aVal - bVal;
                });
                break;
                
            case "max-high":
                // Sort by Maximum Investment descending
                sortedData.sort((a, b) => {
                    const aVal = extractNumericValue(a.avgInvestment);
                    const bVal = extractNumericValue(b.avgInvestment);
                    return bVal - aVal;
                });
                break;
                
            case "outlets":
                // Sort by Number of outlets descending (numeric extraction required)
                sortedData.sort((a, b) => {
                    const aVal = extractOutletCount(a.outlets);
                    const bVal = extractOutletCount(b.outlets);
                    return bVal - aVal;
                });
                break;
                
            case "alpha":
                // Alphabetical ordering by franchise name (A–Z)
                sortedData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
        }
        
        return sortedData;
    }
    
    function maintainOriginalOrder(data) {
        if (state.originalOrder.length === 0) return data;
        
        // Create a map for quick lookup of original positions
        const originalIndexMap = new Map();
        state.originalOrder.forEach((item, index) => {
            originalIndexMap.set(item.id, index);
        });
        
        // Sort by original position
        return data.sort((a, b) => {
            const aIndex = originalIndexMap.get(a.id) || 0;
            const bIndex = originalIndexMap.get(b.id) || 0;
            return aIndex - bIndex;
        });
    }
    
    function extractNumericValue(investmentString) {
        if (!investmentString) return 0;
        // Extract all numbers and take the first one found
        const numbers = investmentString.replace(/[^0-9]/g, '');
        return parseInt(numbers, 10) || 0;
    }
    
    function extractOutletCount(outletsString) {
        if (!outletsString) return 0;
        // Extract the first number found in the string
        const match = outletsString.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }
    
    // Enhanced search functionality with full filtering
    function performSearch(searchTerm) {
        const industrySelect = document.getElementById('industrySelect');
        const orderSelect = document.getElementById('orderSelect');
        const industry = industrySelect ? industrySelect.value : '';
        const order = orderSelect ? orderSelect.value : '';
        
        applyFiltersAndSorting(searchTerm, industry, order);
    }
    
    // Enhanced additional filters function
    function applyAdditionalFilters(industry, order) {
        const searchInput = document.getElementById('search-input');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        applyFiltersAndSorting(searchTerm, industry, order);
    }
    
    // Clear all functionality
    function clearAllFilters() {
        const searchInput = document.getElementById('search-input');
        const industrySelect = document.getElementById('industrySelect');
        const orderSelect = document.getElementById('orderSelect');
        
        if (searchInput) searchInput.value = '';
        if (industrySelect) industrySelect.value = '';
        if (orderSelect) orderSelect.value = '';
        
        // Clear localStorage
        localStorage.removeItem('lastSearch');
        
        // Reset to original state
        resetToOriginalState();
    }
    
    function resetToOriginalState() {
        // Restore original order
        state.filteredFranchises = [...state.originalOrder];
        state.currentFilters = {
            industry: '',
            order: '',
            searchTerm: ''
        };
        state.currentPage = 1;
        renderPage();
    }

    // Helper function to pre-fill form with URL parameters
    function prefillFormWithParams(searchTerm, industry, order) {
        // Pre-fill search input
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchTerm) {
            searchInput.value = searchTerm;
        }
        
        // Pre-fill industry select
        const industrySelect = document.getElementById('industrySelect');
        if (industrySelect && industry) {
            industrySelect.value = industry;
        }
        
        // Pre-fill order select
        const orderSelect = document.getElementById('orderSelect');
        if (orderSelect && order) {
            orderSelect.value = order;
        }
    }

    // Event listener setup
    function setupEventListeners() {
        // Debounced search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            const debouncedSearch = debounce((e) => {
                performSearch(e.target.value);
            }, CONFIG.debounceDelay);
            searchInput.addEventListener('input', debouncedSearch);
            state.eventListeners.set('searchInput', debouncedSearch);
        }

        // Initialize search form events
        initializeSearchFormEvents();
    }

    // Initialize search form event handlers
    function initializeSearchFormEvents() {
        const searchInput = document.getElementById('searchInput');
        const industrySelect = document.getElementById('industrySelect');
        const orderSelect = document.getElementById('orderSelect');
        const exploreBtn = document.getElementById('exploreBtn');
        const clearBtn = document.getElementById('clearBtn');
        const searchBtn = document.getElementById('searchBtn');
        
        // Search input handler
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                performSearch(e.target.value);
            });
        }
        
        // Explore button handler
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                const searchTerm = searchInput ? searchInput.value.trim() : '';
                const industry = industrySelect ? industrySelect.value : '';
                const order = orderSelect ? orderSelect.value : '';
                
                // Apply filters and sorting together in a single pass
                applyFiltersAndSorting(searchTerm, industry, order);
            });
        }
        
        // Clear button handler
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                clearAllFilters();
            });
        }
        
        // Search button handler (magnifying glass)
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchTerm = searchInput ? searchInput.value.trim() : '';
                performSearch(searchTerm);
            });
        }
    }

    // Search functionality - uses enhanced filtering system
    function performSearch(searchTerm) {
        if (state.searchWorker) {
            state.searchWorker.postMessage({
                action: 'filterData',
                searchTerm: searchTerm,
                industry: '',
                order: ''
            });
        } else {
            // Use enhanced filtering system for fallback
            const industrySelect = document.getElementById('industrySelect');
            const orderSelect = document.getElementById('orderSelect');
            const industry = industrySelect ? industrySelect.value : '';
            const order = orderSelect ? orderSelect.value : '';
            
            applyFiltersAndSorting(searchTerm, industry, order);
        }
    }

    // Rendering functions
    function renderPage() {
        const totalPages = Math.ceil(state.filteredFranchises.length / CONFIG.itemsPerPage);
        const startIndex = (state.currentPage - 1) * CONFIG.itemsPerPage;
        const endIndex = startIndex + CONFIG.itemsPerPage;
        const pageItems = state.filteredFranchises.slice(startIndex, endIndex);
        
        renderCards(pageItems);
        renderPagination(totalPages);
        
        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `${state.filteredFranchises.length} results found`;
        }
    }

    function renderCards(items) {
        const grid = document.getElementById('results-grid');
        
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No franchises found</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = '';
        const fragment = createCardFragment(items);
        grid.appendChild(fragment);
    }

    function renderPagination(totalPages) {
        const paginationContainer = document.querySelector('.pagination');
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="btn-prev" ${state.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${state.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <span class="page-num ${i === state.currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</span>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="btn-next" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${state.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }

    function changePage(page) {
        const totalPages = Math.ceil(state.filteredFranchises.length / CONFIG.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        state.currentPage = page;
        renderPage();
        
        // Scroll to top of results
        const grid = document.getElementById('results-grid');
        grid.scrollIntoView({ behavior: 'smooth' });
    }

    // Utility functions
    function showErrorMessage() {
        const grid = document.getElementById('results-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load franchise data</h3>
                    <p>This page requires a local server to load the franchise data.</p>
                    <p><strong>Quick fix:</strong> Run a simple HTTP server:</p>
                    <ul>
                        <li>Python 3: <code>python -m http.server 8000</code></li>
                        <li>Python 2: <code>python -m SimpleHTTPServer 8000</code></li>
                        <li>Node.js: <code>npx http-server -p 8000</code></li>
                    </ul>
                    <p>Then visit: <a href="http://localhost:8000/search.html">http://localhost:8000/search.html</a></p>
                </div>
            `;
        }
    }

    // Cleanup function
    function cleanup() {
        // Remove event listeners
        state.eventListeners.forEach((listener, element) => {
            if (element && listener) {
                element.removeEventListener('input', listener);
            }
        });
        
        // Terminate worker
        if (state.searchWorker) {
            state.searchWorker.terminate();
        }
    }

    // Handle URL parameters and localStorage for search parameters
    function handleSearchParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('q');
        const industry = urlParams.get('industry');
        const order = urlParams.get('order');
        
        // Check localStorage as fallback
        const storedSearch = localStorage.getItem('lastSearch');
        let searchConfig = {};
        
        if (storedSearch) {
            try {
                searchConfig = JSON.parse(storedSearch);
            } catch (e) {
                console.error('Error parsing stored search:', e);
            }
        }
        
        // Use URL params if available, otherwise use stored params
        const finalSearchTerm = searchTerm || searchConfig.searchTerm || '';
        const finalIndustry = industry || searchConfig.industry || '';
        const finalOrder = order || searchConfig.orderBy || '';
        
        // Apply the search parameters if any exist
        if (finalSearchTerm || finalIndustry || finalOrder) {
            // Set the form values
            prefillFormWithParams(finalSearchTerm, finalIndustry, finalOrder);
            
            // Apply the filters
            performSearch(finalSearchTerm);
            
            // If there are additional filters, apply them
            if (finalIndustry || finalOrder) {
                applyAdditionalFilters(finalIndustry, finalOrder);
            }
        }
    }

    // Global functions for HTML onclick handlers
    window.changePage = changePage;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

})();
