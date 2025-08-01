// localStorage Management for SMS Broadcasting App

class LocalStorageManager {
    constructor() {
        this.CAMPAIGNS_KEY = 'sms_campaigns';
        this.STATISTICS_KEY = 'sms_statistics';
        this.SETTINGS_KEY = 'sms_settings';
    }

    // Campaign Management
    saveCampaign(campaign) {
        const campaigns = this.getCampaigns();
        campaigns.unshift(campaign); // Add to beginning
        
        // Keep only last 100 campaigns
        if (campaigns.length > 100) {
            campaigns.splice(100);
        }
        
        localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(campaigns));
        this.updateDailyStatistics(campaign);
        return campaign;
    }

    getCampaigns() {
        try {
            return JSON.parse(localStorage.getItem(this.CAMPAIGNS_KEY) || '[]');
        } catch (error) {
            console.error('Error loading campaigns:', error);
            return [];
        }
    }

    getCampaignById(id) {
        const campaigns = this.getCampaigns();
        return campaigns.find(campaign => campaign.id === id);
    }

    deleteCampaign(id) {
        const campaigns = this.getCampaigns();
        const filtered = campaigns.filter(campaign => campaign.id !== id);
        localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(filtered));
        this.recalculateStatistics();
    }

    // Statistics Management
    updateDailyStatistics(campaign) {
        const today = new Date().toISOString().split('T')[0];
        const stats = this.getStatistics();
        
        if (!stats[today]) {
            stats[today] = {
                date: today,
                total_campaigns: 0,
                total_messages_sent: 0,
                total_successful: 0,
                total_failed: 0,
                total_cost: 0
            };
        }
        
        stats[today].total_campaigns += 1;
        stats[today].total_messages_sent += campaign.total_recipients;
        stats[today].total_successful += campaign.successful_sends;
        stats[today].total_failed += campaign.failed_sends;
        stats[today].total_cost += campaign.total_cost;
        
        localStorage.setItem(this.STATISTICS_KEY, JSON.stringify(stats));
    }

    getStatistics() {
        try {
            return JSON.parse(localStorage.getItem(this.STATISTICS_KEY) || '{}');
        } catch (error) {
            console.error('Error loading statistics:', error);
            return {};
        }
    }

    getDailyStatistics(days = 30) {
        const stats = this.getStatistics();
        const dates = Object.keys(stats).sort().reverse().slice(0, days);
        return dates.map(date => stats[date]);
    }

    getOverallStatistics() {
        const campaigns = this.getCampaigns();
        
        const overall = {
            total_campaigns: campaigns.length,
            total_messages: 0,
            total_successful: 0,
            total_failed: 0,
            total_cost: 0
        };

        campaigns.forEach(campaign => {
            overall.total_messages += campaign.total_recipients;
            overall.total_successful += campaign.successful_sends;
            overall.total_failed += campaign.failed_sends;
            overall.total_cost += campaign.total_cost;
        });

        overall.success_rate = overall.total_messages > 0 
            ? (overall.total_successful / overall.total_messages * 100) 
            : 0;

        return overall;
    }

    recalculateStatistics() {
        // Clear existing statistics
        localStorage.removeItem(this.STATISTICS_KEY);
        
        // Recalculate from campaigns
        const campaigns = this.getCampaigns();
        campaigns.forEach(campaign => {
            this.updateDailyStatistics(campaign);
        });
    }

    // Settings Management
    saveSettings(settings) {
        const currentSettings = this.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
        return updatedSettings;
    }

    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
        } catch (error) {
            console.error('Error loading settings:', error);
            return {};
        }
    }

    // Data Export/Import
    exportData() {
        return {
            campaigns: this.getCampaigns(),
            statistics: this.getStatistics(),
            settings: this.getSettings(),
            exported_at: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.campaigns) {
                localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(data.campaigns));
            }
            if (data.statistics) {
                localStorage.setItem(this.STATISTICS_KEY, JSON.stringify(data.statistics));
            }
            if (data.settings) {
                localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(data.settings));
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Data Cleanup
    clearAllData() {
        localStorage.removeItem(this.CAMPAIGNS_KEY);
        localStorage.removeItem(this.STATISTICS_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
    }

    clearOldData(daysToKeep = 90) {
        const campaigns = this.getCampaigns();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const filteredCampaigns = campaigns.filter(campaign => {
            const campaignDate = new Date(campaign.created_at);
            return campaignDate > cutoffDate;
        });

        localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(filteredCampaigns));
        this.recalculateStatistics();
    }

    // Storage Info
    getStorageInfo() {
        const campaigns = this.getCampaigns();
        const statistics = this.getStatistics();
        const settings = this.getSettings();

        return {
            campaigns_count: campaigns.length,
            statistics_days: Object.keys(statistics).length,
            storage_size: this.getStorageSize(),
            last_campaign: campaigns.length > 0 ? campaigns[0].created_at : null
        };
    }

    getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('sms_')) {
                total += localStorage[key].length;
            }
        }
        return total;
    }

    // Search and Filter
    searchCampaigns(query) {
        const campaigns = this.getCampaigns();
        const lowerQuery = query.toLowerCase();

        return campaigns.filter(campaign => 
            campaign.message.toLowerCase().includes(lowerQuery) ||
            campaign.id.toLowerCase().includes(lowerQuery)
        );
    }

    filterCampaignsByDate(startDate, endDate) {
        const campaigns = this.getCampaigns();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return campaigns.filter(campaign => {
            const campaignDate = new Date(campaign.created_at);
            return campaignDate >= start && campaignDate <= end;
        });
    }

    filterCampaignsByStatus(status) {
        const campaigns = this.getCampaigns();
        
        return campaigns.filter(campaign => {
            if (status === 'success') {
                return campaign.failed_sends === 0;
            } else if (status === 'partial') {
                return campaign.successful_sends > 0 && campaign.failed_sends > 0;
            } else if (status === 'failed') {
                return campaign.successful_sends === 0;
            }
            return true;
        });
    }
}

// Create global instance
window.localStorageManager = new LocalStorageManager();

// Utility functions for easy access
window.smsStorage = {
    saveCampaign: (campaign) => window.localStorageManager.saveCampaign(campaign),
    getCampaigns: () => window.localStorageManager.getCampaigns(),
    getOverallStats: () => window.localStorageManager.getOverallStatistics(),
    getDailyStats: (days) => window.localStorageManager.getDailyStatistics(days),
    searchCampaigns: (query) => window.localStorageManager.searchCampaigns(query),
    exportData: () => window.localStorageManager.exportData(),
    clearData: () => window.localStorageManager.clearAllData()
};

// Auto-cleanup old data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Clean up data older than 90 days
    window.localStorageManager.clearOldData(90);
});