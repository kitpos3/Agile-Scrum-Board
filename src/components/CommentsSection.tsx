import { useState, useEffect, FormEvent, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { Loader2, Send, Trash2, Image as ImageIcon } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

const customUrlTransform = (url: string) => {
  if (url.startsWith('data:image/')) {
    return url;
  }
  return defaultUrlTransform(url);
};

interface CommentsSectionProps {
  user: User;
  taskId: string;
  activeDeveloper?: any;
}

export default function CommentsSection({ user, taskId, activeDeveloper }: CommentsSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; commentId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSubmitting(true);
    try {
      const base64 = await resizeImage(file);
      setNewComment(prev => prev + (prev ? '\n' : '') + `![image](${base64})`);
    } catch (error) {
      console.error("Failed to process image", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUpload(file);
          break;
        }
      }
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!taskId) return;
    fetchComments();

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${taskId}` }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        text: newComment.trim(),
        author_id: user.id,
        author_name: activeDeveloper?.name || user.user_metadata?.full_name || user.email || "Unknown User",
        author_photo_url: user.user_metadata?.avatar_url || "",
      });
      if (error) throw error;
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setConfirmModal({ isOpen: true, commentId });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    try {
      const { error } = await supabase.from("comments").delete().eq("id", confirmModal.commentId);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting comment:", error);
    } finally {
      setConfirmModal(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#5b9ff9]" /></div>;
  }

  return (
    <div className="border-t border-[#1a1a30] pt-5">
      <h3 className="text-sm font-bold font-sans tracking-tight text-white mb-4">Comments</h3>

      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-xs text-[#777799] italic">No comments yet.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-[#1a1a30] rounded-lg p-3 relative group">
              <div className="flex items-center gap-2 mb-2">
                {comment.author_photo_url ? (
                  <img src={comment.author_photo_url} alt={comment.author_name} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#2a2a44] flex items-center justify-center text-[10px] text-white font-bold">
                    {comment.author_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <span className="text-xs font-semibold text-[#aaaacc]">{comment.author_name}</span>
                <span className="text-[10px] text-[#555566]">
                  {comment.created_at ? new Date(comment.created_at).toLocaleString() : 'Just now'}
                </span>
              </div>
              <div className="text-sm text-[#e0e0ee] whitespace-pre-wrap break-words prose prose-invert prose-sm max-w-none prose-a:text-[#5b9ff9] prose-img:rounded-lg prose-img:max-h-60">
                <Markdown remarkPlugins={[remarkGfm]} urlTransform={customUrlTransform}>{comment.text}</Markdown>
              </div>

              {comment.author_id === user.id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="absolute top-3 right-3 text-[#777799] hover:text-[#ff6b6b] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add a comment... (Markdown supported for links, images, etc.)"
            className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors min-h-[40px] max-h-[120px] resize-y font-mono"
            maxLength={500000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-2 bottom-3 text-[#777799] hover:text-[#5b9ff9] transition-colors"
            title="Upload Image"
            disabled={submitting}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="bg-[#2a2a44] text-white p-2 rounded-lg hover:bg-[#3a3a55] transition-colors disabled:opacity-50 h-fit self-end"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {confirmModal && confirmModal.isOpen && (
        <ConfirmModal
          title="Delete Comment"
          message="Are you sure you want to delete this comment?"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
