// Performance-optimized JSM Franchising website
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        initialLoadCount: 12,
        batchSize: 8,
        debounceDelay: 300,
        workerUrl: 'franchise-worker.js'
    };

    // State management
    const state = {
        allFranchises: [],
        filteredFranchises: [],
        currentPage: 1,
        isLoading: false,
        hasMore: true,
        searchWorker: null,
        searchModal: null,
        isModalOpen: false,
        eventListeners: new Map()
    };

    // Initialize application
    function init() {
        setupEventListeners();
        setupWebWorker();
        loadInitialData();
        initTestimonials();
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
        const { type, data, startIndex, endIndex } = e.data;
        
        switch (type) {
            case 'initialDataLoaded':
                renderInitialCards(data);
                break;
            case 'moreDataLoaded':
                appendCards(data);
                state.isLoading = false;
                break;
            case 'filteredData':
                state.filteredFranchises = data;
                renderFilteredResults(data);
                break;
            case 'dataReady':
                console.log('Worker ready for processing');
                break;
        }
    }

    // Event listener management
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

        // Infinite scroll
        window.addEventListener('scroll', debounce(handleScroll, 100));
        
        // Modal events
        setupModalEvents();
        
        // Category card navigation
        setupCategoryCardNavigation();
    }

    function setupModalEvents() {
        const modal = document.getElementById('search-modal');
        if (modal) {
            const closeBtn = modal.querySelector('.close-search-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeSearchModal);
            }
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeSearchModal();
                }
            });
        }
    }

    function setupCategoryCardNavigation() {
        // Add click event listeners to all category cards
        const categoryCards = document.querySelectorAll('.category-card[data-category]');
        
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                if (category) {
                    navigateToSearch(category);
                }
            });
        });
    }

    // Data loading
    async function loadInitialData() {
        try {
            const response = await fetch('franchises.json');
            const data = await response.json();
            
            state.allFranchises = data;
            
            if (state.searchWorker) {
                state.searchWorker.postMessage({
                    action: 'setFullData',
                    data: data
                });
                state.searchWorker.postMessage({
                    action: 'loadInitialData',
                    data: data
                });
            } else {
                // Fallback for browsers without Web Worker support
                const initialData = data.slice(0, CONFIG.initialLoadCount);
                renderInitialCards(initialData);
            }
            
            // Load category sections
            loadCategorySections();
            
        } catch (error) {
            console.error('Error loading franchises:', error);
            showErrorMessage('Unable to load franchise data');
        }
    }

    // DOM manipulation optimizations
    function createCardFragment(items) {
        const fragment = document.createDocumentFragment();
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'franchise-card';
            card.innerHTML = `
                <div class="logo-container">
                    <img src="${item.logo}" alt="${item.name} logo" loading="lazy">
                </div>
                <span class="cat-label">${item.category}</span>
                <h3 class="franchise-name">${item.name}</h3>
                
                <div class="data-row">
                    <span class="data-label">Average investment</span>
                    <span class="data-value">${item.avgInvestment}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Minimum Investment</span>
                    <span class="data-value">${item.minInvestment}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Franchise outlets</span>
                    <span class="data-value">${item.outlets}</span>
                </div>
                
                <a href="franchiseInfo.html?id=${item.id}" class="know-more-btn">Know More</a>
            `;
            fragment.appendChild(card);
        });
        
        return fragment;
    }

    function renderInitialCards(items) {
        const grid = document.getElementById('franchise-grid');
        if (grid) {
            grid.innerHTML = '';
            const fragment = createCardFragment(items);
            grid.appendChild(fragment);
        }
    }

    function appendCards(items) {
        const grid = document.getElementById('franchise-grid');
        if (grid && items.length > 0) {
            const fragment = createCardFragment(items);
            grid.appendChild(fragment);
        }
    }

    function renderFilteredResults(items) {
        const grid = document.getElementById('results-grid');
        if (grid) {
            grid.innerHTML = '';
            if (items.length === 0) {
                grid.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>No franchises found</h3>
                        <p>Try adjusting your search terms or filters</p>
                    </div>
                `;
            } else {
                const fragment = createCardFragment(items);
                grid.appendChild(fragment);
            }
        }
    }

    // Search functionality
    function performSearch(searchTerm) {
        if (state.searchWorker) {
            state.searchWorker.postMessage({
                action: 'filterData',
                searchTerm: searchTerm,
                industry: '',
                order: ''
            });
        } else {
            // Fallback search
            const filtered = state.allFranchises.filter(item => 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
            renderFilteredResults(filtered);
        }
    }

    // Infinite scroll - Optimized with throttling
    function handleScroll() {
        if (state.isLoading || !state.hasMore) return;
        
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        // Increase threshold to reduce scroll event frequency
        if (scrollTop + clientHeight >= scrollHeight - 300) {
            loadMoreData();
        }
    }

    function loadMoreData() {
        if (state.isLoading) return;
        
        state.isLoading = true;
        const startIndex = state.allFranchises.length;
        const endIndex = startIndex + CONFIG.batchSize;
        
        if (state.searchWorker) {
            state.searchWorker.postMessage({
                action: 'loadMoreData',
                data: { startIndex, endIndex }
            });
        } else {
            // Fallback
            const chunk = state.allFranchises.slice(startIndex, endIndex);
            if (chunk.length > 0) {
                appendCards(chunk);
                state.isLoading = false;
            } else {
                state.hasMore = false;
            }
        }
    }

    // Modal management
    function openSearchModal() {
        if (state.isModalOpen) return;
        
        if (!state.searchModal) {
            state.searchModal = createSearchModal();
        }
        
        showSearchModal();
        document.body.style.overflow = 'hidden';
        state.isModalOpen = true;
    }

    function closeSearchModal() {
        if (!state.isModalOpen || !state.searchModal) return;
        
        hideSearchModal();
        document.body.style.overflow = '';
        state.isModalOpen = false;
        
        setTimeout(() => {
            if (state.searchModal) {
                state.searchModal.remove();
                state.searchModal = null;
            }
        }, 300);
    }

    function createSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'search-modal-overlay';
        modal.innerHTML = `
            <div class="search-modal-content">
                <div class="search-modal-header">
                    <h2>Search Franchises</h2>
                    <button class="close-search-btn" aria-label="Close search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="search-header">
                    <div class="search-box">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="modal-search-input" placeholder="Search franchises...">
                    </div>
                    <div class="results-info">
                        <span id="modal-results-count">0 results found</span>
                    </div>
                </div>
                <div id="modal-results-grid" class="results-grid"></div>
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('.close-search-btn').addEventListener('click', closeSearchModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSearchModal();
            }
        });
        
        document.body.appendChild(modal);
        return modal;
    }

    function showSearchModal() {
        if (!state.searchModal) return;
        
        state.searchModal.style.opacity = '0';
        state.searchModal.style.display = 'flex';
        
        void state.searchModal.offsetWidth;
        
        state.searchModal.style.opacity = '1';
        state.searchModal.querySelector('.search-modal-content').style.transform = 'translateY(0)';
    }

    function hideSearchModal() {
        if (!state.searchModal) return;
        
        state.searchModal.style.opacity = '0';
        state.searchModal.querySelector('.search-modal-content').style.transform = 'translateY(-20px)';
    }

    // Category sections
    function loadCategorySections() {
        const top_opp_grid = document.getElementById('opps-grid');
        if (top_opp_grid && state.allFranchises.length > 0) {
            const topOpps = getRandomItems(state.allFranchises, 8);
            const fragment = createCardFragment(topOpps);
            top_opp_grid.appendChild(fragment);
        }
    }

    function getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }

    // Testimonials
    function initTestimonials() {
        let currentIndex = 0;
        const track = document.getElementById('sliderTrack');
        const dots = document.querySelectorAll('.dot');

        function updateSlider() {
            if (track) {
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
            }
            if (dots) {
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });
            }
        }

        function currentSlide(index) {
            currentIndex = index;
            updateSlider();
        }

        // Add event listeners for dots
        if (dots) {
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => currentSlide(index));
            });
        }

        // Auto-play
        setInterval(() => {
            currentIndex = (currentIndex + 1) % (dots ? dots.length : 1);
            updateSlider();
        }, 5000);
    }

    // Utility functions
    function showErrorMessage(message) {
        const grid = document.getElementById('franchise-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                    <h3>${message}</h3>
                    <p>This page requires a local server to load the franchise data.</p>
                    <p><strong>Quick fix:</strong> Run a simple HTTP server:</p>
                    <ul>
                        <li>Python 3: <code>python -m http.server 8000</code></li>
                        <li>Python 2: <code>python -m SimpleHTTPServer 8000</code></li>
                        <li>Node.js: <code>npx http-server -p 8000</code></li>
                    </ul>
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

    // Global functions for HTML onclick handlers
    window.scheduleCall = function() {
        alert("Redirecting to calendar...");
    };

    window.openSearchModal = openSearchModal;
    window.closeSearchModal = closeSearchModal;

    // Navigation function for category cards
    window.navigateToSearch = function(category) {
        const url = new URL('searchPage.html', window.location.origin);
        url.searchParams.set('category', category);
        window.location.href = url.toString();
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

})();
