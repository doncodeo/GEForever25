// Server configuration
const SERVER_URL = 'https://geedeeserver.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {

    // --- CONFIGURATION ---
    const weddingDate = new Date('December 13, 2025 10:00:00').getTime();
    const mapCoordinates = [9.1023, 7.4227]; // Approx. coords for Jahi, Abuja

    // --- LOAD UPLOADED PHOTOS ---
    async function loadUploadedPhotos() {
        try {
            const response = await fetch(`${SERVER_URL}/api/media`);
            const result = await response.json();

            const uploadedPhotosContainer = document.getElementById('uploaded-photos');
            const loadingElement = document.getElementById('uploaded-photos-loading');
            const noPhotosElement = document.getElementById('no-uploaded-photos');

            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }

            if (result.success && result.data.media.length > 0) {
                noPhotosElement.classList.add('hidden');

                const groupedByUploader = result.data.media.reduce((acc, media) => {
                    const uploader = media.uploader || 'Anonymous';
                    if (!acc[uploader]) {
                        acc[uploader] = [];
                    }
                    acc[uploader].push(media);
                    return acc;
                }, {});

                uploadedPhotosContainer.innerHTML = '';

                for (const uploader in groupedByUploader) {
                    const mediaItems = groupedByUploader[uploader].filter(item => item.mimetype.startsWith('image/'));

                    if (mediaItems.length === 0) continue;

                    if (mediaItems.length === 1) {
                        const media = mediaItems[0];
                        const photoElement = document.createElement('div');
                        photoElement.className = 'reveal uploaded-photo';

                        photoElement.innerHTML = `
                            <img src="${media.cloudinaryUrl}" alt="Uploaded by ${media.uploader}" class="rounded-lg shadow-md cursor-pointer gallery-item hover:scale-105 transition-transform duration-300 w-full h-48 object-cover">
                            <div class="mt-2 text-xs text-gray-600">
                                <p class="font-semibold">${media.uploader}</p>
                                ${media.message ? `<p class="truncate">"${media.message}"</p>` : ''}
                            </div>
                        `;
                        const img = photoElement.querySelector('img');
                        img.addEventListener('click', () => {
                            const lightbox = document.getElementById('lightbox');
                            const lightboxImg = document.getElementById('lightbox-img');
                            lightboxImg.src = img.src;
                            lightbox.classList.remove('hidden');
                            document.body.style.overflow = 'hidden';
                        });
                        uploadedPhotosContainer.appendChild(photoElement);
                    } else {
                        const stackContainer = document.createElement('div');
                        stackContainer.className = 'reveal uploaded-photo relative cursor-pointer';

                        const imageContainer = document.createElement('div');
                        imageContainer.className = 'relative';

                        const photoCountBadge = document.createElement('div');
                        photoCountBadge.className = 'absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full';
                        photoCountBadge.textContent = `${mediaItems.length} photos`;

                        imageContainer.appendChild(photoCountBadge);

                        mediaItems.forEach((media, index) => {
                            const img = document.createElement('img');
                            img.src = media.cloudinaryUrl;
                            img.alt = `Uploaded by ${uploader}`;
                            img.className = `rounded-lg shadow-md w-full h-48 object-cover ${index === 0 ? 'block' : 'hidden'}`;
                            imageContainer.appendChild(img);
                        });

                        stackContainer.appendChild(imageContainer);

                        let currentIndex = 0;
                        const message = mediaItems[currentIndex].message || '';

                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'mt-2 text-xs text-gray-600';
                        infoDiv.innerHTML = `
                            <p class="font-semibold">${uploader}</p>
                            <p class="truncate">"${message}"</p>
                        `;
                        stackContainer.appendChild(infoDiv);

                        stackContainer.addEventListener('click', () => {
                            const imageUrls = mediaItems.map(item => item.cloudinaryUrl);
                            showLightbox(imageUrls, 0);
                        });

                        uploadedPhotosContainer.appendChild(stackContainer);
                    }
                }

                const newReveals = uploadedPhotosContainer.querySelectorAll('.reveal');
                newReveals.forEach(el => {
                    setTimeout(() => el.classList.add('visible'), 100);
                });
            } else {
                noPhotosElement.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading uploaded photos:', error);
            const loadingElement = document.getElementById('uploaded-photos-loading');
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="text-red-600">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Failed to load guest photos</p>
                    </div>
                `;
            }
        }
    }

    // Load photos when page loads
    await loadUploadedPhotos();

    // --- UPLOAD FORM HANDLING ---
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    const uploadSubmit = document.getElementById('upload-submit');
    const uploadText = document.getElementById('upload-text');
    const uploadSpinner = document.getElementById('upload-spinner');
    const mediaInput = document.getElementById('media');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    if (mediaInput) {
        mediaInput.addEventListener('change', () => {
            imagePreviewContainer.innerHTML = ''; // Clear previous previews
            const files = mediaInput.files;
            if (files.length > 0) {
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'w-full h-24 object-cover rounded-lg';
                            imagePreviewContainer.appendChild(img);
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(uploadForm);
            const files = document.getElementById('media').files;

            if (files.length === 0) {
                showUploadStatus('Please select at least one file to upload.', 'error');
                return;
            }

            // Show loading state
            uploadSubmit.disabled = true;
            uploadText.textContent = 'Uploading...';
            uploadSpinner.classList.remove('hidden');
            uploadStatus.innerHTML = '';

            try {
                const response = await fetch(`${SERVER_URL}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showUploadStatus(
                        `Successfully uploaded ${result.data.files.length} file(s)! They will appear in the gallery shortly.`,
                        'success'
                    );
                    uploadForm.reset();

                    // Reload the uploaded photos section
                    setTimeout(loadUploadedPhotos, 1000);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showUploadStatus(`Upload failed: ${error.message}`, 'error');
            } finally {
                // Reset button state
                uploadSubmit.disabled = false;
                uploadText.textContent = 'Upload Photos & Videos';
                uploadSpinner.classList.add('hidden');
            }
        });
    }

    function showUploadStatus(message, type) {
        const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                      type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
                      'bg-blue-100 border-blue-400 text-blue-700';

        const icon = type === 'success' ? 'fa-check-circle' :
                   type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';

        uploadStatus.innerHTML = `
            <div class="${bgColor} border px-4 py-3 rounded flex items-center">
                <i class="fas ${icon} mr-2"></i>
                ${message}
            </div>
        `;

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                uploadStatus.innerHTML = '';
            }, 5000);
        }
    }

    // --- EXISTING FUNCTIONALITY (keep all your existing JavaScript code) ---
    // MOBILE MENU
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    const hamburgerIcon = mobileMenuButton.querySelector('i');

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        hamburgerIcon.classList.toggle('fa-bars');
        hamburgerIcon.classList.toggle('fa-times');
    });
    closeMobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        hamburgerIcon.classList.add('fa-bars');
        hamburgerIcon.classList.remove('fa-times');
    });
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.hasAttribute('download')) {
                mobileMenu.classList.add('hidden');
                hamburgerIcon.classList.add('fa-bars');
                hamburgerIcon.classList.remove('fa-times');
            }
        });
    });

    // COUNTDOWN TIMER
    const daysEl = document.getElementById('days'), hoursEl = document.getElementById('hours'), minutesEl = document.getElementById('minutes'), secondsEl = document.getElementById('seconds');
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = weddingDate - now;
        if (distance < 0) {
            clearInterval(timer);
            document.getElementById('countdown').innerHTML = `<div class="col-span-4 text-center"><h3 class="text-4xl font-display">We're Married!</h3></div>`;
            return;
        }
        daysEl.innerText = Math.floor(distance / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
        hoursEl.innerText = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
        minutesEl.innerText = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        secondsEl.innerText = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');
    }, 1000);

    // INVITATION PARTICLE ANIMATION
    const particleContainer = document.getElementById('particle-container');
    if (particleContainer) {
        const particles = 50;
        const symbols = ['❤', '❀', '✨'];
        const colors = ['var(--gold)', 'var(--peach)', '#ff6b6b'];
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            const isSymbol = Math.random() > 0.7;
            if (isSymbol) {
                particle.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
                particle.style.fontSize = `${12 + Math.random() * 8}px`;
            } else {
                particle.style.width = `${4 + Math.random() * 4}px`;
                particle.style.height = particle.style.width;
            }
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = `${Math.random() * 100}%`;
            const animDuration = 8 + Math.random() * 10;
            const animDelay = Math.random() * 10;
            particle.style.animation = `${isSymbol ? 'float' : 'fall'} ${animDuration}s ${animDelay}s linear infinite`;
            particleContainer.appendChild(particle);
        }
    }

    // VENUE CARD CLICK
    const venueCard = document.getElementById('venueCard');
    if (venueCard) {
        venueCard.addEventListener('click', () => {
            document.getElementById('location').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // LEAFLET MAP
    const mapElement = document.getElementById('map');
    if (mapElement) {
        const map = L.map('map').setView(mapCoordinates, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            zIndex: 1
        }).addTo(map);
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: var(--peach); width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"><i class="fas fa-heart text-[var(--emerald)] text-xl"></i></div>`,
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });
        L.marker(mapCoordinates, { icon: customIcon, zIndexOffset: 1000 }).addTo(map)
            .bindPopup('<b>Glisten International Academy</b><br>Our Wedding Venue').openPopup();
    }

    // GALLERY LIGHTBOX
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxCounter = document.getElementById('lightbox-counter');

    let currentLightboxImages = [];
    let currentIndex = 0;

    function showLightbox(images, index) {
        currentLightboxImages = images;
        currentIndex = index;
        updateLightbox();
        lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        lightboxImg.src = currentLightboxImages[currentIndex];
        lightboxCounter.textContent = `${currentIndex + 1} / ${currentLightboxImages.length}`;
        lightboxPrev.classList.toggle('hidden', currentLightboxImages.length <= 1);
        lightboxNext.classList.toggle('hidden', currentLightboxImages.length <= 1);
    }

    function closeLightbox() {
        lightbox.classList.add('hidden');
        document.body.style.overflow = 'auto';
        currentLightboxImages = [];
        currentIndex = 0;
    }

    lightboxPrev.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
        updateLightbox();
    });

    lightboxNext.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % currentLightboxImages.length;
        updateLightbox();
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => e.target === lightbox && closeLightbox());

    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const imageUrls = Array.from(galleryItems).map(i => i.src);
            showLightbox(imageUrls, index);
        });
    });

    // ACCOUNT NUMBER COPY BUTTON
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const accountNumber = document.getElementById('account-number').innerText;
            const copyBtnText = document.getElementById('copy-btn-text');
            navigator.clipboard.writeText(accountNumber).then(() => {
                copyBtnText.innerText = 'Copied!';
                copyBtn.classList.add('bg-green-500', 'text-white');
                copyBtn.classList.remove('bg-gray-200', 'text-gray-700');
                setTimeout(() => {
                    copyBtnText.innerText = 'Copy';
                    copyBtn.classList.remove('bg-green-500', 'text-white');
                    copyBtn.classList.add('bg-gray-200', 'text-gray-700');
                }, 2000);
            });
        });
    }

    // FLOATING CTA & SCROLL-TO-TOP BUTTONS
    const ctaMainBtn = document.getElementById('cta-main-btn');
    const ctaIcon = ctaMainBtn.querySelector('i');
    const ctaButtons = document.getElementById('cta-buttons');
    const scrollTopBtn = document.getElementById('scroll-top-btn');

    ctaMainBtn.addEventListener('click', () => {
        ctaButtons.classList.toggle('hidden');
        ctaButtons.classList.toggle('flex');
        ctaIcon.classList.toggle('rotate-45');
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('opacity-100', 'pointer-events-auto');
            scrollTopBtn.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            scrollTopBtn.classList.remove('opacity-100', 'pointer-events-auto');
            scrollTopBtn.classList.add('opacity-0', 'pointer-events-none');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // CTA UPLOAD BUTTON
    const ctaUploadButton = document.getElementById('cta-upload-button');
    if (ctaUploadButton) {
        ctaUploadButton.addEventListener('click', () => {
            document.getElementById('share-photos').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // SCROLL-REVEAL ANIMATIONS
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));

    // COUNTDOWN POPUP
    const countdownPopup = document.getElementById('countdown-popup');
    const popupMessage = document.getElementById('popup-message');
    const popupCloseButton = document.getElementById('popup-close');

    function showCountdownPopup() {
        const now = new Date().getTime();
        const distance = weddingDate - now;
        if (distance <= 0) return;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        popupMessage.innerText = `Only ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds to our wedding!`;
        countdownPopup.classList.remove('opacity-0', 'pointer-events-none');
        countdownPopup.classList.add('opacity-100', 'pointer-events-auto');

        setTimeout(() => {
            countdownPopup.classList.remove('opacity-100', 'pointer-events-auto');
            countdownPopup.classList.add('opacity-0', 'pointer-events-none');
        }, 10000);
    }

    setTimeout(showCountdownPopup, 2000);
    setInterval(showCountdownPopup, 18000000);

    popupCloseButton.addEventListener('click', () => {
        countdownPopup.classList.remove('opacity-100', 'pointer-events-auto');
        countdownPopup.classList.add('opacity-0', 'pointer-events-none');
    });

});
