(function() {
    'use strict';

    // State management
    const state = {
        currentSlide: 0,
        testimonialInterval: null
    };

    function init() {
        setupCategoryNavigation();
        initTestimonials();
    }

    // Handle Category Card Clicks
    function setupCategoryNavigation() {
        const cards = document.querySelectorAll('.category-card[data-category]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                if (category) {
                    window.location.href = `searchPage.html?category=${encodeURIComponent(category)}`;
                }
            });
        });
    }

    // Testimonial Slider logic
    function initTestimonials() {
        const track = document.getElementById('sliderTrack');
        const dots = document.querySelectorAll('.dot');
        
        if (!track || dots.length === 0) return;

        function updateSlider(index) {
            state.currentSlide = index;
            // Move track based on index (100% per card)
            track.style.transform = `translateX(-${index * 100}%)`;
            
            // Update active dot
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }

        // Add Click events to dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(state.testimonialInterval); // Reset auto-play on manual click
                updateSlider(index);
                startAutoPlay(); 
            });
        });

        // Auto-play every 5 seconds
        function startAutoPlay() {
            state.testimonialInterval = setInterval(() => {
                state.currentSlide = (state.currentSlide + 1) % dots.length;
                updateSlider(state.currentSlide);
            }, 5000);
        }

        startAutoPlay();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();