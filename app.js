class YouTubeTracker {
    constructor() {
        this.apiKey = config.YOUTUBE_API_KEY;
        this.channels = config.CHANNELS;
        this.videosContainer = document.getElementById('videos-container');
        this.videos = new Map();
        this.currentFilter = 'all';
        this.setupChannelFilters();
    }

    setupChannelFilters() {
        const channelBadges = document.querySelectorAll('.channel-badge');
        channelBadges.forEach(badge => {
            badge.addEventListener('click', () => {
                const channel = badge.getAttribute('data-channel');
                this.filterVideos(channel);
                
                channelBadges.forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
            });
        });

        const allBadge = document.createElement('div');
        allBadge.className = 'channel-badge active';
        allBadge.textContent = 'All Channels';
        allBadge.addEventListener('click', () => {
            this.filterVideos('all');
            channelBadges.forEach(b => b.classList.remove('active'));
            allBadge.classList.add('active');
        });
        document.querySelector('.channels').prepend(allBadge);
    }

    filterVideos(channel) {
        this.currentFilter = channel;
        this.videosContainer.innerHTML = '';
        
        if (channel === 'all') {
            for (let [channelHandle, videos] of this.videos) {
                videos.forEach(video => this.displayVideo(video.snippet, channelHandle, video.id));
            }
        } else {
            const channelVideos = this.videos.get(channel) || [];
            channelVideos.forEach(video => this.displayVideo(video.snippet, channel, video.id));
        }
    }

    async init() {
        try {
            this.videosContainer.innerHTML = '';
            this.showLoading();
            await this.fetchAllChannelsVideos();
            this.hideLoading();
            this.filterVideos('all');
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Failed to load videos. Please try again later.');
        }
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.id = 'loading-message';
        loading.className = 'loading-message';
        loading.textContent = 'Loading videos...';
        this.videosContainer.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('loading-message');
        if (loading) {
            loading.remove();
        }
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        this.videosContainer.appendChild(error);
    }

    async fetchAllChannelsVideos() {
        for (const channelHandle of this.channels) {
            try {
                const channelId = await this.getChannelId(channelHandle);
                if (channelId) {
                    await this.fetchChannelVideos(channelId, channelHandle);
                }
            } catch (error) {
                console.error(`Error fetching videos for ${channelHandle}:`, error);
            }
        }
    }

    async getChannelId(channelHandle) {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=id&q=${channelHandle}&type=channel&key=${this.apiKey}`
        );
        const data = await response.json();
        return data.items[0]?.id?.channelId;
    }

    async fetchChannelVideos(channelId, channelHandle) {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${this.apiKey}`
        );
        const data = await response.json();

        if (!this.videos.has(channelHandle)) {
            this.videos.set(channelHandle, []);
        }

        for (const item of data.items) {
            const videoId = item.id.videoId;
            const videoDetails = await this.fetchVideoDetails(videoId);
            
            if (videoDetails.description.toLowerCase().includes('unstable')) {
                this.videos.get(channelHandle).push({
                    snippet: item.snippet,
                    id: videoId
                });
            }
        }
    }

    async fetchVideoDetails(videoId) {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.apiKey}`
        );
        const data = await response.json();
        return data.items[0].snippet;
    }

    displayVideo(snippet, channelHandle, videoId) {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        const publishDate = new Date(snippet.publishedAt);
        const formattedDate = publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const isNew = (Date.now() - publishDate.getTime()) < (3 * 24 * 60 * 60 * 1000);
        
        videoCard.innerHTML = `
            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
                <img src="${snippet.thumbnails.high.url}" alt="${snippet.title}" class="video-thumbnail">
                ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                <div class="video-info">
                    <h3 class="video-title">${snippet.title}</h3>
                    <p class="video-channel">${channelHandle}</p>
                    <p class="video-date">${formattedDate}</p>
                </div>
            </a>
        `;
        this.videosContainer.appendChild(videoCard);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tracker = new YouTubeTracker();
    tracker.init();
}); 