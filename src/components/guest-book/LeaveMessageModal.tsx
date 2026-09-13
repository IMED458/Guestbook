import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Video,
  Send,
  Loader2,
  Heart,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.ts';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type UploadedMedia } from '../../lib/cloudinary.ts';
import { GuestMessage } from '../../types.ts';
import { useI18n } from '../../lib/i18n.tsx';
import { useModalA11y } from '../../lib/useModalA11y.ts';

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
  const [consentGiven, setConsentGiven] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { ref: dialogRef } = useModalA11y(isOpen, onClose);

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

    if (!consentGiven) {
      setError(
        lang === 'ka'
          ? 'გამოქვეყნებამდე გთხოვთ დაეთანხმოთ ჩანაწერის გამოქვეყნებას.'
          : 'Please confirm you agree to your entry being published.'
      );
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
    setConsentGiven(false);
    setError(null);
    setSubmittedSuccess(false);
    onClose();
  };

  const fieldClasses =
    'w-full px-3.5 py-3 text-base sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all';

  return (
    // The sheet fills the screen on a phone and floats as a card from `sm` up.
    // `dvh` keeps it inside the visible area while the mobile browser bars
    // slide in and out, and `overscroll-contain` stops a scroll that reaches
    // the end of the sheet from dragging the page behind it.
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-message-title"
        id="leave-message-card"
        tabIndex={-1}
        className="w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl sm:border sm:border-stone-200 relative flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90dvh]"
      >
        {/* Header stays pinned so the close button is always reachable, no
            matter how far the guest has scrolled down the form. */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-stone-100">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold mb-1">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" aria-hidden="true" />
              <span>{t('guestbook', 'leaveMessage')}</span>
            </div>
            <h2 id="leave-message-title" className="text-lg sm:text-2xl font-serif font-bold text-stone-900 leading-tight">
              {submittedSuccess
                ? (lang === 'ka' ? 'დიდი მადლობა!' : 'Thank You!')
                : (lang === 'ka' ? 'დატოვეთ მოგონება' : 'Leave a Memory')}
            </h2>
          </div>

          <button
            type="button"
            onClick={resetForm}
            aria-label={lang === 'ka' ? 'ფანჯრის დახურვა' : 'Close this dialog'}
            title={lang === 'ka' ? 'დახურვა' : 'Close'}
            className="shrink-0 -mr-1 w-11 h-11 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {submittedSuccess ? (
          /* Success Screen */
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <p className="mt-2 text-sm sm:text-base text-stone-600 max-w-xs mx-auto">
              {isModerated
                ? (lang === 'ka' ? 'თქვენი შეტყობინება გაიგზავნა და გამოჩნდება მასპინძლის დამტკიცების შემდეგ ❤️' : 'Your message has been submitted and is awaiting approval by the host ❤️')
                : (lang === 'ka' ? 'თქვენი შეტყობინება წარმატებით დაემატა სტუმრების წიგნს ❤️' : 'Your message has been added to the guest book ❤️')}
            </p>

            <div className="mt-8">
              <button
                id="message-success-close-btn"
                onClick={resetForm}
                className="w-full min-h-12 py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'ka' ? 'დახურვა და კედლის ნახვა' : 'Close & View Memory Wall'}
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen — the fields scroll, the submit bar stays put. */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8 py-5 space-y-4">
              <p className="text-xs text-stone-600 -mt-1">
                {lang === 'ka'
                  ? 'გაუზიარეთ მოგონება, თბილი სურვილები ან დაუვიწყარი ფოტო.'
                  : 'Share a memory, a warm blessing, or an unforgettable photo.'}
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-center gap-2"
                >
                  <span>{error}</span>
                </div>
              )}

              {/* Name & Relationship Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="guest-name-input" className="block text-xs font-semibold text-stone-800 mb-1">
                    {t('guestbook', 'yourName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="guest-name-input"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ka' ? 'მაგ. ნინო და გიორგი' : 'e.g. Maya & Leo'}
                    className={fieldClasses}
                  />
                </div>

                <div>
                  <label htmlFor="guest-relationship-select" className="block text-xs font-semibold text-stone-800 mb-1">
                    {t('guestbook', 'relationship')}
                  </label>
                  <select
                    id="guest-relationship-select"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className={`${fieldClasses} cursor-pointer`}
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
                <label htmlFor="guest-email-input" className="block text-xs font-semibold text-stone-800 mb-1">
                  {t('guestbook', 'email')}{' '}
                  <span className="text-stone-600 font-normal">({lang === 'ka' ? 'არასავალდებულო' : 'optional'})</span>
                </label>
                <input
                  id="guest-email-input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-describedby="guest-email-hint"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={fieldClasses}
                />
                <p id="guest-email-hint" className="mt-1 text-[11px] text-stone-600 italic">
                  {lang === 'ka'
                    ? 'სრულიად კონფიდენციალურია — საჯაროდ არასდროს ჩანს.'
                    : 'Kept strictly private, never shown publicly.'}
                </p>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="guest-message-input" className="block text-xs font-semibold text-stone-800 mb-1">
                  {t('guestbook', 'message')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="guest-message-input"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={lang === 'ka' ? 'დაწერეთ თქვენი გულწრფელი სურვილები, მოგონებები...' : 'Write your wishes, blessings, or favorite memories...'}
                  className={`${fieldClasses} resize-y min-h-28`}
                />
              </div>

              {/* Reaction selection */}
              <div>
                <span id="reaction-group-label" className="block text-xs font-semibold text-stone-800 mb-1.5">
                  {lang === 'ka' ? 'აირჩიეთ ემოცია' : 'Pick a Reaction Stamp'}
                </span>
                <div role="group" aria-labelledby="reaction-group-label" className="grid grid-cols-7 gap-1.5 sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      aria-pressed={selectedEmoji === emoji}
                      aria-label={`${lang === 'ka' ? 'რეაქცია' : 'Reaction'} ${emoji}`}
                      className={`w-full sm:w-11 h-11 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                        selectedEmoji === emoji
                          ? 'bg-rose-100 border-2 border-rose-500 shadow-xs'
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
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
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
                    className="flex-1 min-h-11 py-2 px-3 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-stone-600" aria-hidden="true" />
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
                    className="flex-1 min-h-11 py-2 px-3 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Video className="w-4 h-4 text-stone-600" aria-hidden="true" />
                    <span>{lang === 'ka' ? 'ვიდეოს ატვირთვა' : 'Upload Video'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVideoInput(!showVideoInput)}
                  className="text-[11px] text-stone-600 hover:text-stone-900 underline underline-offset-2 cursor-pointer py-1"
                >
                  {lang === 'ka' ? 'ან ჩასვით ვიდეოს ბმული' : 'or paste a video link instead'}
                </button>

                {/* Upload progress */}
                {isUploading && (
                  <div className="space-y-1.5" role="status" aria-live="polite">
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
                      alt={lang === 'ka' ? 'ატვირთული ფოტოს გადახედვა' : 'Uploaded photo preview'}
                      className="max-h-44 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      aria-label={lang === 'ka' ? 'ატვირთული ფოტოს წაშლა' : 'Remove the uploaded photo'}
                      className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-stone-900/80 text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer"
                      title={lang === 'ka' ? 'ფოტოს წაშლა' : 'Remove photo'}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
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
                      aria-label={lang === 'ka' ? 'ატვირთული ვიდეოს წაშლა' : 'Remove the uploaded video'}
                      className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-stone-900/80 text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer"
                      title={lang === 'ka' ? 'ვიდეოს წაშლა' : 'Remove video'}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Video URL input */}
                {showVideoInput && !video && (
                  <div className="pt-1">
                    <input
                      type="url"
                      inputMode="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder={lang === 'ka' ? 'https://www.youtube.com/watch?v=... ან MP4 ბმული' : 'https://www.youtube.com/watch?v=... or MP4 URL'}
                      className={fieldClasses}
                    />
                  </div>
                )}
              </div>

              {/* Explicit, unticked consent — GDPR requires a positive act,
                  and the guest must know what is published and what is not. */}
              <div className="pt-2 border-t border-stone-100">
                <label
                  htmlFor="guest-consent-checkbox"
                  className="flex items-start gap-2.5 text-xs text-stone-800 leading-relaxed cursor-pointer"
                >
                  <input
                    id="guest-consent-checkbox"
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    required
                    aria-describedby="guest-consent-detail"
                    className="mt-0.5 w-5 h-5 shrink-0 rounded border-stone-400 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
                  />
                  <span>
                    {lang === 'ka'
                      ? 'ვეთანხმები, რომ ჩემი სახელი, შეტყობინება და ატვირთული ფაილები გამოქვეყნდეს ამ სტუმრების წიგნში.'
                      : 'I agree that my name, message, and any files I upload may be published in this guest book.'}
                    <span className="text-rose-600" aria-hidden="true"> *</span>
                  </span>
                </label>

                <p id="guest-consent-detail" className="mt-2 pl-7 text-[11px] text-stone-600 leading-relaxed">
                  {lang === 'ka'
                    ? 'ელფოსტა არჩევითია, საჯაროდ არასდროს ჩანს და მას მხოლოდ ღონისძიების მასპინძელი ხედავს. ჩანაწერის წაშლა შეგიძლიათ მასპინძელთან დაკავშირებით.'
                    : 'The email field is optional, is never shown publicly, and is visible only to the host of this event. You can ask the host to remove your entry at any time.'}
                </p>
              </div>
            </div>

            {/* Submit bar — pinned to the bottom of the sheet, clear of the
                iPhone home indicator. */}
            <div className="shrink-0 border-t border-stone-100 bg-white px-5 sm:px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl">
              <button
                id="submit-message-btn"
                type="submit"
                disabled={loading || isUploading}
                className="w-full min-h-12 py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{lang === 'ka' ? 'მოგონება ინახება...' : 'Saving your memory...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>{t('guestbook', 'publishMessage')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
