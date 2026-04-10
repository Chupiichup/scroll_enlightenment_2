/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Bell, 
  Settings, 
  MoreHorizontal, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Library,
  Book,
  ScrollText,
  Sparkles,
  ChevronRight,
  Calendar,
  Filter,
  User,
  Menu,
  X,
  Trash2,
  CheckSquare,
  Type,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  MessageSquare,
  Zap,
  BarChart3,
  LayoutDashboard,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { breakdownTask, decomposeGoal } from "@/src/lib/gemini";
import ReactMarkdown from "react-markdown";
import confetti from 'canvas-confetti';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/src/lib/firebase";

// --- Types ---
interface Column {
  id: string;
  title: string;
  color: string;
  ownerId: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  level: "grand" | "year" | "quarter" | "month" | "week";
  parentId?: string;
  targetValue: number;
  currentValueAbs: number;
  progressAvg: number;
  unit: string;
  timeValue: string;
  startDate: string;
  endDate: string;
  createdAt: any;
  linkedTaskIds?: string[];
  updateMethod?: "manual" | "average";
}

interface Task {
  id: string;
  goalId: string;
  title: string;
  ownerId: string;
  progress: number;
  createdAt: any;
  columnId: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  deadline: string;
  tags: string[];
  checklist: ChecklistItem[];
  linkedGoalId?: string;
}

interface SubTask {
  id: string;
  title: string;
  taskId: string;
  ownerId: string;
  dayOfWeek?: number;
  date?: string;
  priority: "Low" | "Medium" | "High";
  notes: string;
  isCompleted: boolean;
  createdAt: any;
}

// --- Mock Data ---
const INITIAL_COLUMNS: Column[] = [
  { id: "todo", title: "Kinh Thư (Cần Học)", color: "border-silk", ownerId: "" },
  { id: "in-progress", title: "Đang Nghiên Cứu", color: "border-sage/30", ownerId: "" },
  { id: "review", title: "Ôn Tập Đạo Pháp", color: "border-cinnabar/20", ownerId: "" },
  { id: "done", title: "Công Thành Danh Toại", color: "border-sage", ownerId: "" },
];

const INITIAL_TASKS: Task[] = [
  { 
    id: "1", 
    goalId: "",
    columnId: "todo", 
    title: "Nghiên cứu React Server Components", 
    description: "Tìm hiểu về cơ chế hoạt động của RSC và cách tối ưu hóa hiệu năng.",
    priority: "High", 
    deadline: "2026-04-12",
    progress: 0,
    tags: ["React", "Advanced"],
    checklist: [],
    ownerId: "",
    createdAt: null
  },
  { 
    id: "2", 
    goalId: "",
    columnId: "in-progress", 
    title: "Luyện Ngữ Pháp IELTS", 
    description: "Tập trung vào các cấu trúc câu phức và từ vựng học thuật.",
    priority: "Medium", 
    deadline: "2026-04-10",
    progress: 45,
    tags: ["English", "IELTS"],
    checklist: [
      { id: "c1", text: "Học 20 từ vựng mới", completed: true },
      { id: "c2", text: "Làm bài tập câu bị động", completed: false }
    ],
    ownerId: "",
    createdAt: null
  },
  { 
    id: "3", 
    goalId: "",
    columnId: "review", 
    title: "Cấu Trúc Dữ Liệu & Giải Thuật", 
    description: "Ôn tập về cây nhị phân và đồ thị.",
    priority: "Urgent", 
    deadline: "2026-04-08",
    progress: 80,
    tags: ["CS", "Interview"],
    checklist: [],
    ownerId: "",
    createdAt: null
  },
  { 
    id: "4", 
    goalId: "",
    columnId: "done", 
    title: "Thiết Kế Giao Diện Thủy Mặc", 
    description: "Hoàn thiện các hiệu ứng watercolor cho ứng dụng LearnFlow.",
    priority: "Low", 
    deadline: "2026-04-05",
    progress: 100,
    tags: ["Design"],
    checklist: [],
    ownerId: "",
    createdAt: null
  },
];

// --- Sortable Task Component ---
function SortableTask({ task, getStatusColor, onDelete, onOpen }: { 
  task: Task, 
  getStatusColor: (d: string) => string,
  onDelete: (id: string) => void,
  onOpen: (task: Task) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="oriental-card border-none group overflow-hidden mb-3 relative">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-6 h-6 text-sage hover:bg-sage/10"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(task);
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-6 h-6 text-cinnabar hover:bg-cinnabar/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        
        <div 
          className="cursor-grab active:cursor-grabbing" 
          {...attributes} 
          {...listeners}
          onClick={() => onOpen(task)}
        >
          <CardHeader className="p-4 pb-2 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 font-medium border-silk text-sage">
                    {tag}
                  </Badge>
                ))}
              </div>
              <span className={`cinnabar-seal ${
                task.priority === "Urgent" ? "opacity-100" : "opacity-60"
              }`}>
                {task.priority}
              </span>
            </div>
            <CardTitle className="text-sm font-bold leading-tight group-hover:text-sage transition-colors pr-6">
              {task.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium text-sage/60">
                <span>Tiến độ</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-1 w-full bg-silk/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sage transition-all duration-500" 
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-bold ${getStatusColor(task.deadline)}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.deadline).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}
              </div>
              
              <div className="flex -space-x-2">
                <div className="w-5 h-5 rounded-full border border-silk bg-paper flex items-center justify-center text-[8px] font-bold text-sage">
                  印
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

// --- Goal Node Component ---
function GoalNode({ goal, allGoals, onDecompose, onToggle, isExpanded, expandedGoals, onUpdateValue, isAiLoading, onDelete, onEdit }: {
  goal: Goal,
  allGoals: Goal[],
  onDecompose: (g: Goal) => void,
  onToggle: (id: string) => void,
  isExpanded: boolean,
  expandedGoals: string[],
  onUpdateValue: (id: string, val: number) => void,
  isAiLoading: boolean,
  onDelete: (id: string) => void,
  onEdit: (g: Goal) => void
}) {
  const children = allGoals.filter(g => g.parentId === goal.id);
  const progress = goal.targetValue > 0 ? (goal.currentValueAbs / goal.targetValue) * 100 : 0;
  
  const levelColors: any = {
    "year": "border-cinnabar text-cinnabar bg-cinnabar/5",
    "quarter": "border-sage text-sage bg-sage/5",
    "month": "border-ink text-ink bg-ink/5",
    "week": "border-silk text-ink bg-silk/5"
  };

  return (
    <div className="space-y-4">
      <div className={`p-6 border-l-4 ${levelColors[goal.level]} oriental-card relative group`}>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{goal.level}</span>
              <h4 className="text-lg font-bold italic">{goal.title}</h4>
            </div>
            <p className="text-xs opacity-70">{goal.description}</p>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 h-1.5 bg-silk/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-1000" 
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={goal.currentValueAbs === 0 ? "" : goal.currentValueAbs.toLocaleString('vi-VN')}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    onUpdateValue(goal.id, val ? parseInt(val, 10) : 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-24 h-8 text-xs bg-white/50 border-silk rounded-none font-bold"
                />
                <span className="text-xs opacity-60">/ {goal.targetValue.toLocaleString('vi-VN')} {goal.unit}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 mb-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(goal)}
                className="w-8 h-8 rounded-none text-sage hover:bg-sage/5"
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(goal.id)}
                className="w-8 h-8 rounded-none text-cinnabar hover:bg-cinnabar/5"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            {goal.level !== "week" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDecompose(goal)}
                disabled={isAiLoading}
                className="rounded-none border-current text-[10px] font-bold uppercase"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Phân Rã AI
              </Button>
            )}
            {children.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onToggle(goal.id)}
                className="rounded-none text-[10px] font-bold uppercase"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Thu Gọn" : `Xem ${children.length} Mục Tiêu Con`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="pl-8 border-l border-silk/30 space-y-4 ml-4">
          {children.map(child => (
            <GoalNode 
              key={child.id} 
              goal={child} 
              allGoals={allGoals} 
              onDecompose={onDecompose}
              onToggle={onToggle}
              isExpanded={expandedGoals.includes(child.id)}
              expandedGoals={expandedGoals}
              onUpdateValue={onUpdateValue}
              isAiLoading={isAiLoading}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Components ---
const GoalCard = ({ goal, onEdit, onDelete, onDecompose }: { goal: Goal, onEdit: any, onDelete: any, onDecompose: any }) => {
  const progressAbs = goal.targetValue > 0 ? (goal.currentValueAbs / goal.targetValue) * 100 : 0;
  
  return (
    <Card className="oriental-card border-silk bg-white/60 hover:shadow-xl transition-all group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-silk text-sage">
            {goal.level === 'grand' ? 'Đại Nguyện' : goal.level === 'year' ? 'Năm' : goal.level === 'quarter' ? 'Quý' : goal.level === 'month' ? 'Tháng' : 'Tuần'}
          </Badge>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="w-7 h-7 text-sage" onClick={() => onEdit(goal)}>
              <Settings className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-cinnabar" onClick={() => onDelete(goal.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg font-bold mt-2">{goal.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-sage/70 italic line-clamp-2">{goal.description}</p>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Tiến độ tuyệt đối</span>
              <span>{goal.currentValueAbs} / {goal.targetValue} {goal.unit}</span>
            </div>
            <div className="h-1.5 w-full bg-silk/20 rounded-full overflow-hidden">
              <div className="h-full bg-cinnabar transition-all duration-500" style={{ width: `${Math.min(progressAbs, 100)}%` }} />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Tiến độ trung bình con</span>
              <span>{goal.progressAvg || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-silk/20 rounded-full overflow-hidden">
              <div className="h-full bg-sage transition-all duration-500" style={{ width: `${goal.progressAvg || 0}%` }} />
            </div>
          </div>
        </div>

        {goal.level !== 'week' && (
          <Button 
            variant="outline" 
            className="w-full border-dashed border-silk text-sage text-[10px] uppercase font-bold tracking-widest gap-2"
            onClick={() => onDecompose(goal)}
          >
            <Sparkles className="w-3 h-3" /> Phân rã AI
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  
  const [currentView, setCurrentView] = useState<"grand" | "year" | "quarter" | "month" | "week" | "stats" | "calendar" | "milestones" | "ai" | "library">("grand");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3).toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState("1"); // Should calculate current week of year

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    level: "grand",
    unit: "kg",
    targetValue: 0,
    currentValueAbs: 0,
    title: "",
    description: ""
  });
  
  const [aiProposal, setAiProposal] = useState<any[] | null>(null);
  const [isReviewingAI, setIsReviewingAI] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);

  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState("All");
  
  const [aiChatHistory, setAiChatHistory] = useState<{role: string, content: string}[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Subtasks Listener
  useEffect(() => {
    if (!user) {
      setSubTasks([]);
      return;
    }

    const q = query(
      collection(db, "subtasks"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubTask[];
      setSubTasks(data);
    }, (error) => {
      console.error("Firestore Error Subtasks:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Goals Listener
  useEffect(() => {
    if (!user) {
      setGoals([]);
      return;
    }

    const q = query(
      collection(db, "goals"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(data);
    }, (error) => {
      console.error("Firestore Error Goals:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Tasks Listener
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "tasks"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(data);
    }, (error) => {
      console.error("Firestore Error Tasks:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Progress Calculation Logic
  useEffect(() => {
    if (!user || goals.length === 0) return;

    goals.forEach(async (goal) => {
      const children = goals.filter(g => g.parentId === goal.id);
      if (children.length > 0) {
        const totalProgress = children.reduce((acc, child) => {
          const childProgress = child.targetValue > 0 ? (child.currentValueAbs / child.targetValue) * 100 : 0;
          return acc + childProgress;
        }, 0);
        const avgProgress = totalProgress / children.length;

        if (Math.abs((goal.progressAvg || 0) - avgProgress) > 0.1) {
          try {
            await updateDoc(doc(db, "goals", goal.id), { progressAvg: Math.round(avgProgress) });
          } catch (error) {
            console.error("Auto Update Goal Progress Error:", error);
          }
        }
      }
    });
  }, [goals, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiện popup hoặc thử mở ứng dụng trong tab mới.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Tên miền này chưa được ủy quyền trong Firebase Console. Vui lòng kiểm tra lại danh sách Authorized Domains.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        alert("Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất. Vui lòng thử lại và không đóng cửa sổ cho đến khi đăng nhập xong. Nếu vẫn lỗi, hãy thử mở ứng dụng trong tab mới.");
      } else {
        alert("Lỗi đăng nhập: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Browser Notification Request & Deadline Check
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkDeadlines = () => {
      const now = new Date();
      tasks.forEach(task => {
        const due = new Date(task.deadline);
        const diffMs = due.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24 && Notification.permission === "granted") {
          new Notification("Sắp đến hạn học tập!", {
            body: `Mục tiêu "${task.title}" sẽ hết hạn trong vòng 24 giờ tới.`,
            icon: "https://picsum.photos/seed/learn/100/100"
          });
        }
      });
    };

    const interval = setInterval(checkDeadlines, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [tasks]);

  const getStatusColor = (deadline: string) => {
    const now = new Date();
    const due = new Date(deadline);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-cinnabar bg-cinnabar/5 border-cinnabar/20";
    if (diffDays <= 2) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-sage bg-sage/5 border-sage/10";
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveTask(tasks.find(t => t.id === active.id) || null);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = tasks.some((t) => t.id === activeId);
    const isOverATask = tasks.some((t) => t.id === overId);

    if (!isActiveATask) return;

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      const activeTask = tasks.find((t) => t.id === activeId);
      const overTask = tasks.find((t) => t.id === overId);

      if (activeTask && overTask && activeTask.columnId !== overTask.columnId) {
        updateDoc(doc(db, "tasks", activeId as string), {
          columnId: overTask.columnId
        });
      }
    }

    // Dropping a Task over a Column
    const isOverAColumn = columns.some((c) => c.id === overId);
    if (isActiveATask && isOverAColumn) {
      const activeTask = tasks.find((t) => t.id === activeId);
      if (activeTask && activeTask.columnId !== overId) {
        updateDoc(doc(db, "tasks", activeId as string), {
          columnId: overId as string
        });
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over) {
      const activeTask = tasks.find(t => t.id === active.id);
      if (activeTask && over.id === "done" && activeTask.columnId !== "done") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5D6D5D', '#A63D33', '#D4C5B3']
        });
      }
    }
    setActiveId(null);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!selectedTask || !user) return;
    const updatedTask = { ...selectedTask, ...updates };
    
    // Calculate progress if checklist changed
    if (updates.checklist) {
      const total = updates.checklist.length;
      const completed = updates.checklist.filter(i => i.completed).length;
      updatedTask.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    try {
      await updateDoc(doc(db, "tasks", selectedTask.id), updatedTask);
      setSelectedTask(updatedTask);
    } catch (error) {
      console.error("Update Task Error:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setIsDetailOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Delete Task Error:", error);
    }
  };

  const handleAiAssist = async () => {
    if (!selectedTask) return;
    setIsAiLoading(true);
    const steps = await breakdownTask(selectedTask.title);
    if (steps.length > 0) {
      const newItems: ChecklistItem[] = steps.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        text: s,
        completed: false
      }));
      updateTask({ checklist: [...(selectedTask.checklist || []), ...newItems] });
    }
    setIsAiLoading(false);
  };

  const handleAiChat = async () => {
    if (!aiMessage.trim()) return;
    
    const userMsg = { role: "user", content: aiMessage };
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiMessage("");
    setIsAiChatLoading(true);

    try {
      const response = await breakdownTask(`Hãy tư vấn cho tôi về mục tiêu tu luyện sau: ${aiMessage}. Hãy trả lời như một vị sư phụ thông thái trong một thư viện cổ, hướng dẫn đệ tử trên con đường giác ngộ.`);
      const aiMsg = { role: "assistant", content: response.join("\n\n") };
      setAiChatHistory(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const addNewColumn = async () => {
    if (!user || !newColumnTitle.trim()) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newCol = {
      id,
      title: newColumnTitle,
      color: "border-silk",
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      order: columns.length
    };
    try {
      await setDoc(doc(db, "columns", id), newCol);
      setNewColumnTitle("");
      setIsAddingColumn(false);
    } catch (error) {
      console.error("Add Column Error:", error);
    }
  };

  const updateColumnTitle = async (columnId: string) => {
    if (!user || !editingColumnTitle.trim()) return;
    try {
      await updateDoc(doc(db, "columns", columnId), { title: editingColumnTitle });
      setEditingColumnId(null);
      setEditingColumnTitle("");
    } catch (error) {
      console.error("Update Column Error:", error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa cột này? Tất cả mục tiêu trong cột cũng sẽ bị xóa.")) return;
    try {
      // Delete tasks in column
      const tasksInCol = tasks.filter(t => t.columnId === columnId);
      for (const task of tasksInCol) {
        await deleteDoc(doc(db, "tasks", task.id));
      }
      // Delete column
      await deleteDoc(doc(db, "columns", columnId));
    } catch (error) {
      console.error("Delete Column Error:", error);
    }
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.title) return;
    try {
      const goalData = {
        ...newGoal,
        currentValueAbs: 0,
        progressAvg: 0,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      };
      await addDoc(collection(db, "goals"), goalData);
      setIsAddingGoal(false);
      setNewGoal({
        level: "grand",
        unit: "kg",
        targetValue: 0,
        currentValueAbs: 0,
        title: "",
        description: ""
      });
    } catch (error) {
      console.error("Add Goal Error:", error);
      alert("Có lỗi xảy ra khi tạo đại nguyện. Vui lòng thử lại.");
    }
  };

  const handleDecomposeGoal = async (parentGoal: Goal) => {
    if (!parentGoal) return;
    setIsAiLoading(true);
    try {
      const proposal = await decomposeGoal(parentGoal.title, parentGoal.level, parentGoal.targetValue, parentGoal.unit);
      if (proposal) {
        setAiProposal(proposal);
        setEditingGoal(parentGoal);
        setIsReviewingAI(true);
      } else {
        alert("AI không thể phân rã mục tiêu này. Có thể do lỗi định dạng kết quả hoặc thiếu API Key.");
      }
    } catch (error) {
      console.error("Decompose Error:", error);
      alert("Lỗi kết nối AI. Vui lòng kiểm tra lại.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApproveAI = async () => {
    if (!user || !aiProposal || !editingGoal) return;
    
    const createGoalsRecursively = async (items: any[], parentId: string) => {
      for (const item of items) {
        const docRef = await addDoc(collection(db, "goals"), {
          title: item.title,
          description: item.description || "",
          targetValue: Number(item.targetValue) || 0,
          currentValueAbs: 0,
          progressAvg: 0,
          unit: editingGoal.unit,
          level: item.level,
          timeValue: item.timeValue,
          parentId: parentId,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          startDate: editingGoal.startDate,
          endDate: editingGoal.endDate
        });
        
        // If it's a week goal, create tasks
        if (item.level === 'week' && item.children) {
          for (const child of item.children) {
            await addDoc(collection(db, "tasks"), {
              title: child.title,
              description: `Công việc cho tuần ${item.title}`,
              ownerId: user.uid,
              columnId: "todo",
              priority: "Medium",
              progress: 0,
              tags: [],
              checklist: [],
              linkedGoalId: docRef.id,
              createdAt: serverTimestamp()
            });
          }
        }

        if (item.children && item.children.length > 0 && item.level !== 'week') {
          await createGoalsRecursively(item.children, docRef.id);
        }
      }
    };

    try {
      setIsAiLoading(true);
      await createGoalsRecursively(aiProposal, editingGoal.id);
      setIsReviewingAI(false);
      setAiProposal(null);
      setEditingGoal(null);
      confetti();
    } catch (error) {
      console.error("Approve AI Error:", error);
      alert("Có lỗi xảy ra khi tạo các mục tiêu con.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => 
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const toggleSubTask = async (subTask: SubTask) => {
    try {
      await updateDoc(doc(db, "subtasks", subTask.id), { isCompleted: !subTask.isCompleted });
    } catch (error) {
      console.error("Toggle Subtask Error:", error);
    }
  };

  const addSubTask = async (title: string, dayOfWeek: number) => {
    if (!user || !selectedWeekGoal) return;
    try {
      await addDoc(collection(db, "subtasks"), {
        title,
        dayOfWeek,
        isCompleted: false,
        priority: "Medium",
        taskId: selectedWeekGoal.id,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Add Subtask Error:", error);
    }
  };

  const deleteSubTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, "subtasks", id));
    } catch (error) {
      console.error("Delete Subtask Error:", error);
    }
  };

  const updateGoalValue = async (goalId: string, value: number) => {
    try {
      await updateDoc(doc(db, "goals", goalId), { currentValueAbs: value });
    } catch (error) {
      console.error("Update Goal Value Error:", error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này? Tất cả mục tiêu con cũng sẽ bị ảnh hưởng.")) return;
    try {
      await deleteDoc(doc(db, "goals", goalId));
      // Optionally delete children or just leave them orphaned (or handle in rules)
    } catch (error) {
      console.error("Delete Goal Error:", error);
    }
  };

  const handleEditGoal = async () => {
    if (!user || !editingGoal) return;
    try {
      await updateDoc(doc(db, "goals", editingGoal.id), {
        title: editingGoal.title,
        description: editingGoal.description,
        targetValue: editingGoal.targetValue,
        unit: editingGoal.unit,
        level: editingGoal.level
      });
      setIsEditingGoal(false);
      setEditingGoal(null);
    } catch (error) {
      console.error("Update Goal Error:", error);
    }
  };

  const addNewTask = async (columnId: string) => {
    if (!user) return;
    const newTask = {
      columnId,
      title: "Mục tiêu mới",
      description: "",
      priority: "Medium",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      tags: ["Mới"],
      checklist: [],
      ownerId: user.uid,
      createdAt: serverTimestamp()
    };
    
    try {
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      openTaskDetail({ id: docRef.id, ...newTask } as any);
    } catch (error) {
      console.error("Add Task Error:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority = filterPriority === "All" || task.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  // --- Statistics Data ---
  const [selectedWeekGoal, setSelectedWeekGoal] = useState<Goal | null>(null);

  const statsData = useMemo(() => {
    const levelCounts = [
      { name: "Đại Nguyện", value: goals.filter(g => g.level === 'grand').length },
      { name: "Năm", value: goals.filter(g => g.level === 'year').length },
      { name: "Quý", value: goals.filter(g => g.level === 'quarter').length },
      { name: "Tháng", value: goals.filter(g => g.level === 'month').length },
      { name: "Tuần", value: goals.filter(g => g.level === 'week').length },
    ];

    const priorityCounts = [
      { name: "Cao", value: tasks.filter(t => t.priority === 'High').length, color: '#C2410C' },
      { name: "Trung Bình", value: tasks.filter(t => t.priority === 'Medium').length, color: '#5D6D5D' },
      { name: "Thấp", value: tasks.filter(t => t.priority === 'Low').length, color: '#D4C5B3' },
    ];

    return { levelCounts, priorityCounts };
  }, [goals, tasks]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="text-center space-y-4">
          <Library className="w-12 h-12 text-sage animate-pulse mx-auto" />
          <p className="text-sm italic text-sage">Đang mở cổng thư viện...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-sage rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cinnabar rounded-full blur-[100px]"></div>
        </div>
        
        <Card className="w-full max-w-md oriental-card border-silk bg-white/80 backdrop-blur-xl relative z-10 p-12 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 border-2 border-cinnabar rounded-full flex items-center justify-center mx-auto relative">
              <Library className="text-cinnabar w-10 h-10" />
              <div className="absolute -bottom-1 -right-1 bg-cinnabar text-paper text-[10px] px-1.5 font-bold">藏書</div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-widest uppercase">Scroll of Enlightenment</h1>
              <p className="text-xs text-sage font-medium uppercase tracking-[0.2em]">Cổ Thư Tu Tiên</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <p className="text-sm italic text-sage/80 leading-relaxed">
              "Hành trình vạn dặm bắt đầu từ một bước chân. <br/> Hãy đăng nhập để tiếp tục con đường giác ngộ của bạn."
            </p>
            <Button onClick={handleLogin} className="ink-button w-full h-12 text-base rounded-none shadow-xl group">
              <User className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Bước Vào Thư Viện
            </Button>
          </div>
          
          <div className="pt-8 border-t border-silk/30">
            <p className="text-[10px] text-sage/40 uppercase tracking-widest">Bản Toàn Năng © 2026</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-paper text-ink font-serif overflow-hidden">
      {/* Sidebar - Oriental Style */}
      <aside className="w-64 border-r border-silk bg-white/40 backdrop-blur-md flex flex-col">
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-cinnabar rounded-full flex items-center justify-center relative">
            <Library className="text-cinnabar w-8 h-8" />
            <div className="absolute -bottom-1 -right-1 bg-cinnabar text-paper text-[8px] px-1 font-bold">
              藏書
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-bold text-2xl tracking-widest uppercase">Scroll of Enlightenment</h1>
            <p className="text-[10px] text-sage font-medium uppercase tracking-[0.2em]">Cổ Thư Tu Tiên</p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-bold text-sage uppercase tracking-[0.2em] mb-4 px-4 opacity-50">Hệ Thống Đạo Pháp</p>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("grand")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "grand" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Trophy className="w-4 h-4" /> Đại Lộ Công Danh
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("year")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "year" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <Calendar className="w-4 h-4" /> Theo Năm
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("quarter")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "quarter" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Theo Quý
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("month")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "month" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <ScrollText className="w-4 h-4" /> Theo Tháng
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("week")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "week" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Theo Tuần
          </Button>
          
          <Separator className="my-6 bg-silk/30" />
          
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("calendar")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "calendar" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Lịch Trình Tu Luyện
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView("stats")}
            className={`w-full justify-start gap-4 rounded-none transition-all ${
              currentView === "stats" ? "text-sage bg-sage/5 border-l-2 border-sage" : "text-ink/60 hover:text-sage hover:bg-sage/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Thống Kê Đạo Pháp
          </Button>
        </nav>

        <div className="p-6 mt-auto">
          {/* Premium Access card removed */}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-paper/30">
        {/* Header */}
        <header className="h-20 border-b border-silk bg-white/20 backdrop-blur-sm px-10 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
              <Input 
                placeholder="Tìm kiếm kinh thư..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-paper/50 border-silk focus-visible:ring-sage rounded-none italic"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sage">
              <Filter className="w-4 h-4" />
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent border-none text-xs font-bold uppercase tracking-widest focus:ring-0 cursor-pointer"
              >
                <option value="All">Tất cả độ ưu tiên</option>
                <option value="Low">Thấp</option>
                <option value="Medium">Trung Bình</option>
                <option value="High">Cao</option>
                <option value="Urgent">Khẩn Cấp</option>
              </select>
            </div>
            <Button variant="ghost" size="icon" className="relative text-ink/70">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cinnabar rounded-full"></span>
            </Button>
            <div className="flex items-center gap-3 pl-6 border-l border-silk">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold">{user?.displayName || "Học Giả"}</p>
                <p className="text-[9px] text-sage uppercase tracking-tighter">Học Giả</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-silk p-0.5 relative cursor-pointer" onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}>
                <div className="w-full h-full rounded-full bg-sage/10 flex items-center justify-center overflow-hidden">
                  <img src={user?.photoURL || "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=100&h=100"} alt="User" referrerPolicy="no-referrer" />
                </div>
                {isAccountMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-silk shadow-2xl z-50 py-2">
                    <div className="px-4 py-2 border-b border-silk/30 mb-2">
                      <p className="text-[10px] text-sage uppercase font-bold">Tài khoản</p>
                      <p className="text-xs truncate font-serif italic">{user?.email}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogout();
                      }}
                      className="w-full justify-start text-sm text-cinnabar hover:bg-cinnabar/5 rounded-none h-12 px-4 font-bold"
                    >
                      <X className="w-4 h-4 mr-2" /> Đăng Xuất
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Board Area */}
        <div className="flex-1 p-10 overflow-hidden flex flex-col relative">
          {/* Watercolor Background Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 mix-blend-multiply overflow-hidden">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-sage rounded-full blur-[100px]"></div>
            <div className="absolute top-1/2 -right-20 w-80 h-80 bg-cinnabar rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-silk rounded-full blur-[100px]"></div>
          </div>

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  {currentView === "grand" && "Đại Lộ Công Danh"}
                  {currentView === "year" && "Đạo Pháp Theo Năm"}
                  {currentView === "quarter" && "Đạo Pháp Theo Quý"}
                  {currentView === "month" && "Đạo Pháp Theo Tháng"}
                  {currentView === "week" && "Đạo Pháp Theo Tuần"}
                  {currentView === "calendar" && "Lịch Trình Tu Luyện"}
                  {currentView === "stats" && "Thống Kê Đạo Pháp"}
                </h2>
                <div className="cinnabar-seal">Bản Toàn Năng</div>
              </div>
              <p className="text-sage/60 text-sm italic">
                {currentView === "grand" && "Nơi khởi nguồn của những đại nguyện vĩ đại."}
                {currentView === "year" && "Tầm nhìn dài hạn cho một năm rực rỡ."}
                {currentView === "quarter" && "Tập trung cao độ cho từng giai đoạn."}
                {currentView === "month" && "Kiên trì bền bỉ qua từng tháng ngày."}
                {currentView === "week" && "Hành động quyết liệt trong từng khoảnh khắc."}
                {currentView === "calendar" && "Thời gian là vàng bạc, hãy trân trọng từng khắc."}
                {currentView === "stats" && "Nhìn lại chặng đường đã qua để vững bước tương lai."}
              </p>
            </div>
            {currentView === "grand" && (
              <Button onClick={() => setIsAddingGoal(true)} className="ink-button gap-2 rounded-none shadow-lg">
                <Plus className="w-4 h-4" /> Khởi Tạo Đại Nguyện
              </Button>
            )}
          </div>

          {currentView === "grand" && (
            <div className="flex-1 overflow-y-auto relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.filter(g => g.level === 'grand').map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={(g: Goal) => { setEditingGoal(g); setIsEditingGoal(true); }} 
                    onDelete={deleteGoal} 
                    onDecompose={handleDecomposeGoal} 
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "year" && (
            <div className="flex-1 overflow-y-auto relative z-10 space-y-6">
              <div className="flex items-center gap-4 bg-white/40 p-4 border border-silk oriental-card">
                <span className="text-xs font-bold uppercase tracking-widest text-sage">Chọn Năm:</span>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.filter(g => g.level === 'year' && g.timeValue === selectedYear).map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={(g: Goal) => { setEditingGoal(g); setIsEditingGoal(true); }} 
                    onDelete={deleteGoal} 
                    onDecompose={handleDecomposeGoal} 
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "quarter" && (
            <div className="flex-1 overflow-y-auto relative z-10 space-y-6">
              <div className="flex items-center gap-8 bg-white/40 p-4 border border-silk oriental-card">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Năm:</span>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Quý:</span>
                  <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {['1', '2', '3', '4'].map(q => <option key={q} value={q}>Quý {q}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.filter(g => g.level === 'quarter' && g.timeValue === selectedQuarter).map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={(g: Goal) => { setEditingGoal(g); setIsEditingGoal(true); }} 
                    onDelete={deleteGoal} 
                    onDecompose={handleDecomposeGoal} 
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "month" && (
            <div className="flex-1 overflow-y-auto relative z-10 space-y-6">
              <div className="flex items-center gap-8 bg-white/40 p-4 border border-silk oriental-card">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Năm:</span>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Tháng:</span>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.filter(g => g.level === 'month' && g.timeValue === selectedMonth).map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={(g: Goal) => { setEditingGoal(g); setIsEditingGoal(true); }} 
                    onDelete={deleteGoal} 
                    onDecompose={handleDecomposeGoal} 
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "week" && (
            <div className="flex-1 flex flex-col relative z-10 space-y-6 overflow-hidden">
              <div className="flex items-center gap-8 bg-white/40 p-4 border border-silk oriental-card">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Năm:</span>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Tháng:</span>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sage">Tuần:</span>
                  <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer">
                    {['1', '2', '3', '4', '5'].map(w => <option key={w} value={w}>Tuần {w}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left Column: Week Goals */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-sage px-2">Mục Tiêu Tuần</h3>
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4">
                      {goals.filter(g => g.level === 'week' && g.timeValue === selectedWeek).map(goal => (
                        <div 
                          key={goal.id} 
                          className={`p-4 border border-silk cursor-pointer transition-all ${selectedWeekGoal?.id === goal.id ? 'bg-sage/10 border-sage shadow-md' : 'bg-white/40 hover:bg-white/60'}`}
                          onClick={() => setSelectedWeekGoal(goal)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold leading-tight">{goal.title}</h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6 text-sage"
                              onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Nhập kết quả thực tế đạt được:", goal.currentValueAbs.toString());
                                if (val !== null) updateGoalValue(goal.id, Number(val));
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-sage">
                            <span>{goal.currentValueAbs} / {goal.targetValue} {goal.unit}</span>
                            <span>{goal.progressAvg}%</span>
                          </div>
                          <div className="mt-1 h-1 w-full bg-silk/20 rounded-full overflow-hidden">
                            <div className="h-full bg-sage" style={{ width: `${goal.progressAvg}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right Area: Daily Columns */}
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map((day, idx) => (
                    <div key={day} className="w-64 flex-shrink-0 flex flex-col gap-4">
                      <div className="bg-paper p-2 text-center text-[10px] font-bold text-sage uppercase tracking-widest border border-silk">
                        {day}
                      </div>
                      <div className="flex-1 bg-white/30 border border-silk/50 p-3 space-y-3 overflow-y-auto">
                        {subTasks.filter(st => st.dayOfWeek === idx + 1).map(st => (
                          <div key={st.id} className="p-3 bg-white border border-silk shadow-sm text-xs group relative">
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[8px] uppercase font-bold px-1 ${st.priority === 'High' ? 'bg-cinnabar/10 text-cinnabar' : 'bg-sage/10 text-sage'}`}>
                                {st.priority}
                              </span>
                              <input 
                                type="checkbox" 
                                checked={st.isCompleted} 
                                onChange={() => toggleSubTask(st)}
                                className="w-3 h-3 rounded-none border-silk text-sage focus:ring-sage cursor-pointer"
                              />
                            </div>
                            <p className={st.isCompleted ? 'line-through text-ink/40' : ''}>{st.title}</p>
                            {st.notes && <p className="text-[9px] text-sage/60 mt-1 italic">{st.notes}</p>}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-silk opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteSubTask(st.id)}
                            >
                              <Trash2 className="w-2 h-2 text-cinnabar" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          className="w-full border border-dashed border-silk/50 text-[10px] text-sage/60 hover:text-sage h-8 rounded-none"
                          onClick={() => {
                            const title = prompt("Nhập tên công việc:");
                            if (title) addSubTask(title, idx + 1);
                          }}
                        >
                          + Thêm việc
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {currentView === "stats" && (
            <div className="flex-1 overflow-y-auto relative z-10 space-y-8 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="oriental-card border-silk bg-white/60">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Phân Bổ Cấp Độ Mục Tiêu</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsData.levelCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D4C5B3" vertical={false} />
                        <XAxis dataKey="name" stroke="#5D6D5D" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#5D6D5D" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#F4F1EA', border: '1px solid #D4C5B3', fontFamily: 'serif' }}
                          cursor={{ fill: '#5D6D5D10' }}
                        />
                        <Bar dataKey="value" fill="#5D6D5D" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="oriental-card border-silk bg-white/60">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Độ Ưu Tiên Công Việc</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statsData.priorityCounts}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statsData.priorityCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#F4F1EA', border: '1px solid #D4C5B3', fontFamily: 'serif' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      {statsData.priorityCounts.map(p => (
                        <div key={p.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-[10px] font-bold text-sage uppercase">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="oriental-card border-silk bg-white/60">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Tiến Độ Đại Nguyện</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {goals.filter(g => g.level === 'grand').map(goal => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold italic">{goal.title}</span>
                          <span className="text-[10px] font-bold text-sage">{goal.progressAvg}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-silk/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sage transition-all duration-1000" 
                            style={{ width: `${goal.progressAvg}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentView === "milestones" && (
            <div className="flex-1 flex flex-col relative z-10 space-y-8 overflow-hidden">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold italic tracking-widest">Đại Lộ Công Danh</h2>
                  <p className="text-xs text-sage italic">Theo dõi lộ trình tu luyện từ Năm đến Tuần</p>
                </div>
                <Button onClick={() => setIsAddingGoal(true)} className="ink-button rounded-none gap-2">
                  <Plus className="w-4 h-4" /> Thiết Lập Đại Nguyện
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-6 pb-20">
                  {goals.filter(g => !g.parentId).map(yearGoal => (
                    <GoalNode 
                      key={yearGoal.id} 
                      goal={yearGoal} 
                      allGoals={goals} 
                      onDecompose={handleDecomposeGoal}
                      onToggle={toggleGoalExpansion}
                      isExpanded={expandedGoals.includes(yearGoal.id)}
                      expandedGoals={expandedGoals}
                      onUpdateValue={updateGoalValue}
                      isAiLoading={isAiLoading}
                      onDelete={deleteGoal}
                      onEdit={(g) => {
                        setEditingGoal(g);
                        setIsEditingGoal(true);
                      }}
                    />
                  ))}
                  {goals.filter(g => !g.parentId).length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-silk/30 italic text-sage/40">
                      Chưa có đại nguyện nào được thiết lập. Hãy bắt đầu hành trình của bạn.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {currentView === "ai" && (
            <div className="flex-1 flex flex-col relative z-10 bg-white/40 border border-silk oriental-card overflow-hidden">
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {aiChatHistory.length === 0 && (
                    <div className="text-center py-20 space-y-4">
                      <Sparkles className="w-12 h-12 text-sage/20 mx-auto" />
                      <h3 className="text-xl font-bold italic">Chào mừng Học Giả</h3>
                      <p className="text-sm text-sage/60">Hãy đặt câu hỏi về mục tiêu học tập, tôi sẽ giúp bạn tìm ra con đường đúng đắn.</p>
                    </div>
                  )}
                  {aiChatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-none border ${
                        msg.role === 'user' 
                        ? 'bg-sage/10 border-sage/20 text-ink italic' 
                        : 'bg-white/80 border-silk text-ink font-serif'
                      }`}>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAiChatLoading && (
                    <div className="flex justify-start">
                      <div className="p-4 bg-white/80 border border-silk animate-pulse flex gap-2 items-center text-sage italic text-sm">
                        <Zap className="w-4 h-4 animate-bounce" /> Vị sư phụ đang suy ngẫm...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-6 border-t border-silk bg-paper/50">
                <div className="max-w-3xl mx-auto flex gap-4">
                  <Input 
                    placeholder="Hỏi về mục tiêu học tập của bạn..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                    className="bg-white border-silk rounded-none italic"
                  />
                  <Button onClick={handleAiChat} disabled={isAiChatLoading} className="ink-button rounded-none">
                    Gửi Lời
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentView === "library" && (
            <div className="flex-1 overflow-y-auto relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {tasks.filter(t => t.columnId === 'done').length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <Book className="w-12 h-12 text-sage/20 mx-auto" />
                    <h3 className="text-xl font-bold italic">Thư Viện Đang Trống</h3>
                    <p className="text-sm text-sage/60">Hãy hoàn thành các mục tiêu để lưu giữ chúng vào thư viện cổ.</p>
                  </div>
                )}
                {tasks.filter(t => t.columnId === 'done').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => openTaskDetail(task)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[3/4] bg-white border-2 border-silk p-4 flex flex-col justify-between shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-2">
                      <div className="absolute left-2 top-0 bottom-0 w-1 bg-silk/20"></div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <Library className="w-4 h-4 text-sage/40" />
                          <div className="cinnabar-seal text-[8px] opacity-40">完</div>
                        </div>
                        <h4 className="font-bold text-sm leading-tight group-hover:text-sage transition-colors">{task.title}</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="h-px bg-silk/30 w-full"></div>
                        <p className="text-[9px] text-sage italic">Hoàn thành: {new Date().toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent className="bg-paper border-silk rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold italic">Chỉnh Sửa Đại Nguyện</DialogTitle>
            <DialogDescription className="text-xs italic">Cập nhật lại con đường tu luyện của bạn.</DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Tên Đại Nguyện</label>
                <Input 
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})}
                  className="bg-white/50 border-silk rounded-none italic"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Mô Tả</label>
                <Textarea 
                  value={editingGoal.description}
                  onChange={(e) => setEditingGoal({...editingGoal, description: e.target.value})}
                  className="bg-white/50 border-silk rounded-none text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">Mục Tiêu (Con số)</label>
                  <Input 
                    type="text"
                    value={editingGoal.targetValue?.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setEditingGoal({...editingGoal, targetValue: val ? parseInt(val, 10) : 0});
                    }}
                    className="bg-white/50 border-silk rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">Đơn Vị</label>
                  <Input 
                    value={editingGoal.unit}
                    onChange={(e) => setEditingGoal({...editingGoal, unit: e.target.value})}
                    className="bg-white/50 border-silk rounded-none"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditingGoal(false)} className="rounded-none">Hủy</Button>
            <Button onClick={handleEditGoal} className="bg-sage text-paper hover:bg-sage/90 rounded-none">Cập Nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Review Dialog */}
      <Dialog open={isReviewingAI} onOpenChange={setIsReviewingAI}>
        <DialogContent className="oriental-card border-silk max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sage" /> Review Phân Rã AI
            </DialogTitle>
            <DialogDescription>
              AI đã đề xuất lộ trình phân rã cho mục tiêu: <span className="font-bold text-ink">{editingGoal?.title}</span>. 
              Bạn có thể chỉnh sửa các con số trước khi duyệt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            {aiProposal?.map((item, idx) => (
              <div key={idx} className="border border-silk p-4 bg-paper/30 space-y-4">
                <div className="flex justify-between items-center">
                  <Input 
                    value={item.title} 
                    onChange={(e) => {
                      const newProposal = [...aiProposal];
                      newProposal[idx].title = e.target.value;
                      setAiProposal(newProposal);
                    }}
                    className="font-bold text-sage bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={item.targetValue}
                      onChange={(e) => {
                        const newProposal = [...aiProposal];
                        newProposal[idx].targetValue = Number(e.target.value);
                        setAiProposal(newProposal);
                      }}
                      className="w-20 h-8 text-right border-silk rounded-none"
                    />
                    <span className="text-xs font-bold text-sage">{editingGoal?.unit}</span>
                  </div>
                </div>
                
                {item.children && item.children.length > 0 && (
                  <div className="pl-6 border-l-2 border-silk/30 space-y-3">
                    {item.children.map((child: any, cIdx: number) => (
                      <div key={cIdx} className="flex justify-between items-center gap-4">
                        <Input 
                          value={child.title}
                          onChange={(e) => {
                            const newProposal = [...aiProposal];
                            newProposal[idx].children[cIdx].title = e.target.value;
                            setAiProposal(newProposal);
                          }}
                          className="text-xs italic bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                        />
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={child.targetValue}
                            onChange={(e) => {
                              const newProposal = [...aiProposal];
                              newProposal[idx].children[cIdx].targetValue = Number(e.target.value);
                              setAiProposal(newProposal);
                            }}
                            className="w-16 h-7 text-[10px] text-right border-silk rounded-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReviewingAI(false)}>Hủy</Button>
            <Button onClick={handleApproveAI} className="ink-button rounded-none" disabled={isAiLoading}>
              {isAiLoading ? "Đang Khởi Tạo..." : "Duyệt & Tạo Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="bg-paper border-silk rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold italic">Thiết Lập Đại Nguyện</DialogTitle>
            <DialogDescription className="text-xs italic">Đặt mục tiêu lớn để bắt đầu con đường tu luyện.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest">Tên Đại Nguyện</label>
              <Input 
                placeholder="Ví dụ: Giảm 20kg trong năm 2026"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                className="bg-white/50 border-silk rounded-none italic"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Cấp Độ</label>
                <select 
                  value={newGoal.level}
                  onChange={(e) => setNewGoal({...newGoal, level: e.target.value as any})}
                  className="w-full bg-white/50 border border-silk p-2 text-sm focus:ring-0 rounded-none"
                >
                  <option value="year">Năm</option>
                  <option value="quarter">Quý</option>
                  <option value="month">Tháng</option>
                  <option value="week">Tuần</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Đơn Vị</label>
                <Input 
                  placeholder="kg, trang, giờ..."
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                  className="bg-white/50 border-silk rounded-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Mục Tiêu (Con số)</label>
                <Input 
                  type="text"
                  value={newGoal.targetValue === 0 ? "" : newGoal.targetValue?.toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewGoal({...newGoal, targetValue: val ? parseInt(val, 10) : 0});
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Nhập số lượng..."
                  className="bg-white/50 border-silk rounded-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">Phương Thức Cập Nhật</label>
                <select 
                  value={newGoal.updateMethod}
                  onChange={(e) => setNewGoal({...newGoal, updateMethod: e.target.value as any})}
                  className="w-full bg-white/50 border border-silk p-2 text-sm focus:ring-0 rounded-none"
                >
                  <option value="manual">Thủ công</option>
                  <option value="task-linked">Liên kết thẻ Kanban</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingGoal(false)} className="rounded-none">Hủy</Button>
            <Button onClick={handleAddGoal} className="ink-button rounded-none">Xác Nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal - Premium Oriental Style */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl bg-paper border-silk p-0 overflow-hidden rounded-none shadow-2xl">
          {selectedTask && (
            <div className="flex flex-col h-[80vh]">
              <div className="p-8 border-b border-silk bg-white/40 flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <ScrollText className="w-5 h-5 text-sage" />
                    <Input 
                      value={selectedTask.title}
                      onChange={(e) => updateTask({ title: e.target.value })}
                      className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 h-auto"
                    />
                  </div>
                  <p className="text-xs text-sage italic">Trong danh mục: {columns.find(c => c.id === selectedTask.columnId)?.title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsDetailOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-2 space-y-8">
                    {/* Description */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-ink/80">
                        <MessageSquare className="w-4 h-4" />
                        <h4 className="font-bold text-sm uppercase tracking-widest">Mô Tả Kinh Thư</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <Textarea 
                          placeholder="Ghi chú chi tiết về mục tiêu học tập này (Hỗ trợ Markdown)..."
                          value={selectedTask.description}
                          onChange={(e) => updateTask({ description: e.target.value })}
                          className="bg-white/50 border-silk rounded-none min-h-[120px] italic text-sm"
                        />
                        {selectedTask.description && (
                          <div className="p-4 bg-sage/5 border border-dashed border-sage/20 rounded-none prose prose-sm max-w-none italic text-sage/80">
                            <ReactMarkdown>{selectedTask.description}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-ink/80">
                          <CheckSquare className="w-4 h-4" />
                          <h4 className="font-bold text-sm uppercase tracking-widest">Các Bước Tu Luyện</h4>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleAiAssist}
                          disabled={isAiLoading}
                          className="gap-2 border-sage text-sage hover:bg-sage/5 rounded-none text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-pulse' : ''}`} />
                          {isAiLoading ? 'Đang Tiên Tri...' : 'AI Tiên Tri'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {selectedTask.checklist.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-3 group">
                            <input 
                              type="checkbox" 
                              checked={item.completed}
                              onChange={(e) => {
                                const newChecklist = [...selectedTask.checklist];
                                newChecklist[idx].completed = e.target.checked;
                                updateTask({ checklist: newChecklist });
                              }}
                              className="w-4 h-4 accent-sage border-silk"
                            />
                            <Input 
                              value={item.text}
                              onChange={(e) => {
                                const newChecklist = [...selectedTask.checklist];
                                newChecklist[idx].text = e.target.value;
                                updateTask({ checklist: newChecklist });
                              }}
                              className="bg-transparent border-none p-0 focus-visible:ring-0 text-sm italic"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 text-cinnabar"
                              onClick={() => {
                                const newChecklist = selectedTask.checklist.filter((_, i) => i !== idx);
                                updateTask({ checklist: newChecklist });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-sage/60 italic text-xs p-0 h-auto hover:bg-transparent hover:text-sage"
                          onClick={() => {
                            const newItem = { id: Math.random().toString(36).substr(2, 9), text: "Bước mới...", completed: false };
                            updateTask({ checklist: [...selectedTask.checklist, newItem] });
                          }}
                        >
                          + Thêm bước mới...
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-6">
                    <div className="space-y-4 border border-silk p-4 bg-white/20">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Độ Ưu Tiên</p>
                        <select 
                          value={selectedTask.priority}
                          onChange={(e) => updateTask({ priority: e.target.value as any })}
                          className="w-full bg-transparent border-none text-sm font-bold text-cinnabar focus:ring-0"
                        >
                          <option value="Low">Thấp</option>
                          <option value="Medium">Trung Bình</option>
                          <option value="High">Cao</option>
                          <option value="Urgent">Khẩn Cấp</option>
                        </select>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Ngày Đến Hạn</p>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3 text-sage" />
                          <input 
                            type="date" 
                            value={selectedTask.deadline}
                            onChange={(e) => updateTask({ deadline: e.target.value })}
                            className="bg-transparent border-none text-sm font-bold focus:ring-0"
                          />
                        </div>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Liên Kết Đại Nguyện</p>
                        <select 
                          value={selectedTask.linkedGoalId || ""}
                          onChange={(e) => {
                            const goalId = e.target.value;
                            updateTask({ linkedGoalId: goalId });
                            
                            // Also update the goal's linkedTaskIds
                            if (goalId) {
                              const goal = goals.find(g => g.id === goalId);
                              if (goal) {
                                const newLinkedTaskIds = [...(goal.linkedTaskIds || []), selectedTask.id];
                                updateDoc(doc(db, "goals", goalId), { linkedTaskIds: Array.from(new Set(newLinkedTaskIds)) });
                              }
                            }
                          }}
                          className="w-full bg-transparent border-none text-xs font-bold text-sage focus:ring-0"
                        >
                          <option value="">Không liên kết</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.title} ({g.level})</option>
                          ))}
                        </select>
                      </div>

                      <Separator className="bg-silk/50" />

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest">Nhãn (Tags)</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTask.tags.map(tag => (
                            <Badge key={tag} className="sage-badge text-[9px] rounded-none">
                              {tag}
                              <X className="w-2 h-2 ml-1 cursor-pointer" onClick={() => updateTask({ tags: selectedTask.tags.filter(t => t !== tag) })} />
                            </Badge>
                          ))}
                          <div className="flex items-center gap-1">
                            <Input 
                              placeholder="Thêm nhãn..."
                              className="h-6 text-[9px] w-20 bg-transparent border-dashed border-silk rounded-none p-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && !selectedTask.tags.includes(val)) {
                                    updateTask({ tags: [...selectedTask.checklist.length > 0 ? selectedTask.tags : selectedTask.tags, val] });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2 text-cinnabar hover:bg-cinnabar/5 rounded-none text-xs font-bold uppercase tracking-widest"
                      onClick={() => deleteTask(selectedTask.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Xóa Mục Tiêu
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
