import { motion } from "framer-motion";

export const AiMessageBubble = ({ message, isUser }) => {
    // Simple basic regex parser for bold (Markdown **bold**) 
    // Usually one uses react-markdown, but we'll do a simple split to keep it atomic without deps
    const parseMarkdownBold = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}
        >
            <div
                className={`max-w-[85%] p-3.5 rounded-2xl shadow-md backdrop-blur-sm whitespace-pre-wrap leading-relaxed text-sm
                ${isUser 
                    ? "bg-green-600/90 text-white rounded-br-none border border-green-500/30" 
                    : "bg-gray-800/80 text-gray-200 rounded-bl-none border border-gray-700/50"
                }`}
            >
                {parseMarkdownBold(message)}
            </div>
        </motion.div>
    );
};
