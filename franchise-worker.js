// Web Worker for handling franchise data processing
self.onmessage = function(e) {
    const { action, data, searchTerm, industry, order } = e.data;
    
    if (action === 'loadInitialData') {
        // Load only first 12 items for initial display
        const initialData = data.slice(0, 12);
        self.postMessage({
            type: 'initialDataLoaded',
            data: initialData
        });
    } else if (action === 'loadMoreData') {
        const { startIndex, endIndex } = data;
        const chunk = self.franchiseData ? self.franchiseData.slice(startIndex, endIndex) : [];
        self.postMessage({
            type: 'moreDataLoaded',
            data: chunk,
            startIndex,
            endIndex
        });
    } else if (action === 'filterData') {
        const filtered = filterFranchises(self.franchiseData || [], searchTerm, industry, order);
        self.postMessage({
            type: 'filteredData',
            data: filtered
        });
    } else if (action === 'setFullData') {
        self.franchiseData = data;
        self.postMessage({
            type: 'dataReady'
        });
    }
};

function filterFranchises(data, searchTerm, industry, order) {
    let filtered = data;
    
    // Apply industry filter
    if (industry && industry.trim()) {
        filtered = filtered.filter(item => {
            const category = (item.category || '').toLowerCase();
            const itemIndustry = (item.industry || '').toLowerCase();
            const filterValue = industry.toLowerCase();
            
            return category.includes(filterValue) || itemIndustry.includes(filterValue);
        });
    }
    
    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
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
    
    // Apply sorting
    if (order && order.trim()) {
        filtered = applySorting(filtered, order);
    }
    
    return filtered;
}

function applySorting(data, order) {
    const sortedData = [...data];
    
    if (order === "min-low") {
        sortedData.sort((a, b) => {
            const aVal = parseInt((a.minInvestment || '0').replace(/\D/g,''));
            const bVal = parseInt((b.minInvestment || '0').replace(/\D/g,''));
            return aVal - bVal;
        });
    } else if (order === "max-high") {
        sortedData.sort((a, b) => {
            const aVal = parseInt((a.avgInvestment || '0').replace(/\D/g,''));
            const bVal = parseInt((b.avgInvestment || '0').replace(/\D/g,''));
            return bVal - aVal;
        });
    } else if (order === "alpha") {
        sortedData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return sortedData;
}
