import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
  Heart,
  CheckCircle2,
  Sparkles,
  Smile,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.ts';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type UploadedMedia } from '../../lib/cloudinary.ts';
import { GuestMessage } from '../../types.ts';
import { useI18n } from '../../lib/i18n.tsx';

interface LeaveMessageModalProps {
  isOpen: boolean;
  guestBookSlug: string;
  isModerated: boolean;
  onClose: () => void;
  onSuccess: (newMessage: GuestMessage) => void;
}

const RELATIONSHIPS = ['Friend', 'Family', 'Colleague', 'Guest', 'Other'];
const EMOJIS = ['❤️', '🥰', '😂', '👏', '🎉', '🥂', '✨'];

export const LeaveMessageModal: React.FC<LeaveMessageModalProps> = ({
  isOpen,
  guestBookSlug,
  isModerated,
  onClose,
  onSuccess
}) => {
  const { t, lang, translateRelationship } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [relationship, setRelationship] = useState<string>('Friend');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('❤️');
  const [photo, setPhoto] = useState<UploadedMedia | null>(null);
  const [video, setVideo] = useState<UploadedMedia | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [uploadKind, setUploadKind] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isUploading = uploadKind !== null;

  // Files go straight from the browser to Cloudinary; Firestore only ever
  // stores the resulting URL.
  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'IMAGE' | 'VIDEO'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const limit = kind === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      setError(
        kind === 'VIDEO'
          ? (lang === 'ka' ? 'ვიდეოს ზომა არ უნდა აღემატებოდეს 100 მბ-ს.' : 'Video size must be less than 100 MB.')
          : (lang === 'ka' ? 'ფოტოს ზომა არ უნდა აღემატებოდეს 10 მბ-ს.' : 'Photo size must be less than 10 MB.')
      );
      e.target.value = '';
      return;
    }

    setError(null);
    setUploadKind(kind);
    setUploadProgress(0);

    try {
      const uploaded = await api.upload.uploadFile(file, setUploadProgress);
      if (uploaded.type === 'VIDEO') {
        setVideo(uploaded);
        setVideoUrl('');
      } else {
        setPhoto(uploaded);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (lang === 'ka' ? 'ფაილის ატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.' : 'Upload failed. Please try again.')
      );
      e.target.value = '';
    } finally {
      setUploadKind(null);
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(lang === 'ka' ? 'გთხოვთ შეიყვანოთ თქვენი სახელი.' : 'Please enter your name.');
      return;
    }

    if (!message.trim()) {
      setError(lang === 'ka' ? 'გთხოვთ დაწეროთ შეტყობინება ან სურვილი.' : 'Please write your message or warm wishes.');
      return;
    }

    setLoading(true);

    try {
      const mediaUrls: { type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string }[] = [];

      if (photo) {
        mediaUrls.push({ type: 'IMAGE', url: photo.url, thumbnailUrl: photo.thumbnailUrl });
      }

      if (video) {
        mediaUrls.push({ type: 'VIDEO', url: video.url, thumbnailUrl: video.thumbnailUrl });
      } else if (videoUrl.trim()) {
        mediaUrls.push({ type: 'VIDEO', url: videoUrl.trim() });
      }

      const res = await api.messages.submit(guestBookSlug, {
        name: name.trim(),
        email: email.trim() || undefined,
        message: message.trim(),
        relationship,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        reactionType: selectedEmoji
      });

      // Trigger celebration confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Safe if confetti fails
      }

      setSubmittedSuccess(true);
      onSuccess(res.message);
    } catch (err: any) {
      setError(err.message || (lang === 'ka' ? 'დაფიქსირდა შეცდომა. გთხოვთ სცადოთ ხელახლა.' : 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setMessage('');
    setPhoto(null);
    setVideo(null);
    setVideoUrl('');
    setShowVideoInput(false);
    setError(null);
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div
        id="leave-message-card"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative my-6"
      >
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-serif font-bold text-stone-900">
              {lang === 'ka' ? 'დიდი მადლობა!' : 'Thank You!'}
            </h3>

            <p className="mt-2 text-sm sm:text-base text-stone-600 max-w-xs mx-auto">
              {isModerated
                ? (lang === 'ka' ? 'თქვენი შეტყობინება გაიგზავნა და გამოჩნდება მასპინძლის დამტკიცების შემდეგ ❤️' : 'Your message has been submitted and is awaiting approval by the host ❤️')
                : (lang === 'ka' ? 'თქვენი შეტყობინება წარმატებით დაემატა სტუმრების წიგნს ❤️' : 'Your message has been added to the guest book ❤️')}
            </p>

            <div className="mt-8">
              <button
                id="message-success-close-btn"
                onClick={resetForm}
                className="w-full py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'ka' ? 'დახურვა და კედლის ნახვა' : 'Close & View Memory Wall'}
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-2">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>{t('guestbook', 'leaveMessage')}</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                {t('guestbook', 'leaveMessage')}
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                {lang === 'ka'
                  ? 'გაუზიარეთ მოგონება, თბილი სურვილები ან დაუვიწყარი ფოტო.'
                  : 'Share a memory, a warm blessing, or an unforgettable photo.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('guestbook', 'yourName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="guest-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ka' ? 'მაგ. ნინო და გიორგი' : 'e.g. Maya & Leo'}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('guestbook', 'relationship')}
                  </label>
                  <select
                    id="guest-relationship-select"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all cursor-pointer"
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {translateRelationship(rel)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Private Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {t('guestbook', 'email')} <span className="text-stone-400 font-normal">({lang === 'ka' ? 'არასავალდებულო' : 'optional'})</span>
                  </label>
                  <span className="text-[10px] text-stone-500 italic">
                    {lang === 'ka' ? 'სრულიად კონფიდენციალურია' : 'Kept strictly private, never shown'}
                  </span>
                </div>
                <input
                  id="guest-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {t('guestbook', 'message')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="guest-message-input"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={lang === 'ka' ? 'დაწერეთ თქვენი გულწრფელი სურვილები, მოგონებები...' : 'Write your wishes, blessings, or favorite memories...'}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all resize-none"
                />
              </div>

              {/* Reaction selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {lang === 'ka' ? 'აირჩიეთ ემოცია' : 'Pick a Reaction Stamp'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-10 h-10 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        selectedEmoji === emoji
                          ? 'bg-rose-100 border-2 border-rose-500 scale-110 shadow-xs'
                          : 'bg-stone-100 hover:bg-stone-200/80 border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Attachments Section */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileSelected(e, 'IMAGE')}
                    className="hidden"
                    id="guest-photo-file-input"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-stone-500" />
                    <span>{t('guestbook', 'attachPhoto')}</span>
                  </button>

                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    onChange={(e) => handleFileSelected(e, 'VIDEO')}
                    className="hidden"
                    id="guest-video-file-input"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="flex-1 py-2 px-3 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Video className="w-4 h-4 text-stone-500" />
                    <span>{lang === 'ka' ? 'ვიდეოს ატვირთვა' : 'Upload Video'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVideoInput(!showVideoInput)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 cursor-pointer"
                >
                  {lang === 'ka' ? 'ან ჩასვით ვიდეოს ბმული' : 'or paste a video link instead'}
                </button>

                {/* Upload progress */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {uploadKind === 'VIDEO'
                          ? (lang === 'ka' ? 'ვიდეო იტვირთება...' : 'Uploading video...')
                          : (lang === 'ka' ? 'ფოტო იტვირთება...' : 'Uploading photo...')}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-900 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Photo Preview */}
                {photo && (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 max-h-48 flex items-center justify-center">
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt="Uploaded preview"
                      className="max-h-44 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-stone-900/80 text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer"
                      title={lang === 'ka' ? 'ფოტოს წაშლა' : 'Remove photo'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Video Preview */}
                {video && (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-black">
                    <video
                      src={video.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-48"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 p-1.5 bg-stone-900/80 text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer"
                      title={lang === 'ka' ? 'ვიდეოს წაშლა' : 'Remove video'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Video URL input */}
                {showVideoInput && !video && (
                  <div className="pt-1">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder={lang === 'ka' ? 'https://www.youtube.com/watch?v=... ან MP4 ბმული' : 'https://www.youtube.com/watch?v=... or MP4 URL'}
                      className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  id="submit-message-btn"
                  type="submit"
                  disabled={loading || isUploading}
                  className="w-full py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ka' ? 'მოგონება ინახება...' : 'Saving your memory...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('guestbook', 'publishMessage')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
