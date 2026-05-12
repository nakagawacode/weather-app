import Image from "next/image";
import { FormEvent, RefObject } from "react";
import {
  ChatMessage,
  getChatImageUrl,
  weatherReactions,
} from "@/lib/chat";

type ChatPanelProps = {
  chatError: string | null;
  chatFileInputRef: RefObject<HTMLInputElement | null>;
  chatImage: File | null;
  chatInput: string;
  chatLoading: boolean;
  chatMessages: ChatMessage[];
  chatRoom: string;
  chatSending: boolean;
  clearSelectedImage: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sendReaction: (body: string) => void;
  setChatImage: (file: File | null) => void;
  setChatInput: (value: string) => void;
  viewerCount: number;
};

export function ChatPanel({
  chatError,
  chatFileInputRef,
  chatImage,
  chatInput,
  chatLoading,
  chatMessages,
  chatRoom,
  chatSending,
  clearSelectedImage,
  onSubmit,
  sendReaction,
  setChatImage,
  setChatInput,
  viewerCount,
}: ChatPanelProps) {
  return (
    <section className="chat-panel" aria-label={`${chatRoom}のチャット`}>
      <div className="chat-header">
        <div>
          <p className="comment-label">Local Chat</p>
          <h2>{chatRoom}の空模様</h2>
        </div>
        <div className="chat-stats">
          <span>閲覧中 {viewerCount}</span>
          <span>{chatMessages.length} messages</span>
        </div>
      </div>

      <div className="chat-log">
        {chatLoading && <p className="chat-muted">読み込み中...</p>}

        {!chatLoading && chatMessages.length === 0 && (
          <p className="chat-muted">まだ投稿がありません。</p>
        )}

        {!chatLoading &&
          chatMessages.map((message) => (
            <article
              className={`chat-message chat-message--${message.kind}`}
              key={message.id}
            >
              <div className="chat-message-body">
                {message.image_path && (
                  <Image
                    className="chat-image"
                    src={getChatImageUrl(message.image_path)}
                    alt=""
                    width={520}
                    height={360}
                  />
                )}
                <p>{message.body}</p>
              </div>
              <time dateTime={message.created_at}>
                {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
      </div>

      <div className="reaction-row" aria-label="天気リアクション">
        {weatherReactions.map((reaction) => (
          <button
            className="reaction-button"
            disabled={chatSending}
            key={reaction}
            onClick={() => sendReaction(reaction)}
            type="button"
          >
            {reaction}
          </button>
        ))}
      </div>

      {chatError && (
        <p className="chat-error" role="alert">
          {chatError}
        </p>
      )}

      <form className="chat-form" onSubmit={onSubmit}>
        <label className="chat-input">
          <span>Message</span>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            maxLength={240}
            rows={3}
            placeholder={`${chatRoom}の天気について投稿`}
          />
        </label>
        <div className="chat-actions">
          <label className="chat-file-button">
            画像を追加
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                setChatImage(event.target.files?.[0] ?? null);
              }}
              ref={chatFileInputRef}
              type="file"
            />
          </label>
          {chatImage && (
            <button
              className="chat-file-clear"
              onClick={clearSelectedImage}
              type="button"
            >
              {chatImage.name}
            </button>
          )}
        </div>
        <button
          className="primary-action"
          disabled={(!chatInput.trim() && !chatImage) || chatSending}
          type="submit"
        >
          {chatSending ? "送信中..." : "投稿"}
        </button>
      </form>
    </section>
  );
}
