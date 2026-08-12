import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: '' },
  caption: { type: String, default: '' },
  hashtags: { type: String, default: '' },
  firstComment: { type: String, default: '' },
  autoReplyMessage: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaUrls: [{ type: String }],
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  postFormat: { type: String, enum: ['standard', 'reels', 'reel', 'story'], default: 'standard' },
  platforms: [{ type: String, default: 'facebook' }],
  targetAccountIds: [{ type: String }],
  accountVariations: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  results: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Pre-validate hook to format hashtags array into a single space-separated string and normalize postFormat
postSchema.pre('validate', function() {
  if (Array.isArray(this.hashtags)) {
    this.hashtags = this.hashtags.join(' ');
  }
  if (this.postFormat === 'reel') {
    this.postFormat = 'reels';
  }
  if (this.accountVariations && typeof this.accountVariations === 'object') {
    for (const pageId in this.accountVariations) {
      if (this.accountVariations[pageId] && Array.isArray(this.accountVariations[pageId].hashtags)) {
        this.accountVariations[pageId].hashtags = this.accountVariations[pageId].hashtags.join(' ');
      }
    }
  }
});

export const Post = mongoose.model('Post', postSchema);
