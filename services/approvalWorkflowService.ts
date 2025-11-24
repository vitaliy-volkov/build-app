import { 
  UserRole, 
  ApprovalStatus, 
  ApprovalAction, 
  ApprovalStep, 
  PaymentApprovalWorkflow, 
  PaymentApprovalHistory, 
  ApprovalWorkflowConfig,
  EstimatePaymentScheduleItem,
  PaymentContext,
  AIAnalysis,
  User
} from '../types';
import { AIService } from './aiService';
import { AINotificationService } from './aiNotificationService';
import { AIConfiguration } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ApprovalWorkflowService {
  
  // 1. Create new approval workflow
  static async createWorkflow(
    paymentItem: EstimatePaymentScheduleItem,
    context: PaymentContext,
    config: ApprovalWorkflowConfig,
    aiConfig: AIConfiguration,
    createdBy: string
  ): Promise<PaymentApprovalWorkflow> {
    const workflowId = uuidv4();
    const now = new Date().toISOString();
    
    // Determine required steps based on configuration
    const steps = this.buildWorkflowSteps(paymentItem, config);
    
    const workflow: PaymentApprovalWorkflow = {
      id: workflowId,
      payment_schedule_item_id: paymentItem.id,
      project_id: context.project_id,
      estimate_id: context.estimate_id,
      current_status: ApprovalStatus.Draft,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
      steps,
      history: []
    };
    
    // Add initial history entry
    workflow.history.push({
      id: uuidv4(),
      workflow_id: workflowId,
      action: ApprovalAction.Create,
      performed_by: createdBy,
      performed_at: now,
      previous_status: ApprovalStatus.Draft,
      new_status: ApprovalStatus.Draft,
      comments: 'Создан workflow согласования платежа'
    });
    
    // Auto-start AI analysis if enabled
    if (config.auto_ai_analysis) {
      return await this.startAIAnalysis(workflow, paymentItem, context, aiConfig);
    }
    
    return workflow;
  }
  
  // 2. Start AI Analysis
  static async startAIAnalysis(
    workflow: PaymentApprovalWorkflow,
    paymentItem: EstimatePaymentScheduleItem,
    context: PaymentContext,
    aiConfig: AIConfiguration
  ): Promise<PaymentApprovalWorkflow> {
    try {
      // Perform AI analysis
      const aiAnalysis = await AIService.analyzePaymentRisk(paymentItem, context, aiConfig);
      
      // Update workflow with AI results
      workflow.ai_analysis = aiAnalysis;
      workflow.ai_recommendation = this.getAIRecommendation(aiAnalysis.score);
      workflow.current_status = ApprovalStatus.AIAnalysis;
      workflow.updated_at = new Date().toISOString();
      
      // Update AI analysis step
      const aiStep = workflow.steps.find(s => s.role === UserRole.Admin); // Using Admin as AI role
      if (aiStep) {
        aiStep.status = 'completed';
        aiStep.completed_at = new Date().toISOString();
        aiStep.ai_score = aiAnalysis.score;
      }
      
      // Add history entry
      workflow.history.push({
        id: uuidv4(),
        workflow_id: workflow.id,
        action: ApprovalAction.AIAnalyze,
        performed_by: 'AI-System',
        performed_at: new Date().toISOString(),
        previous_status: ApprovalStatus.Draft,
        new_status: ApprovalStatus.AIAnalysis,
        comments: `ИИ-анализ завершен. Оценка: ${aiAnalysis.score}/100. Рекомендация: ${workflow.ai_recommendation}`,
        ai_score_at_time: aiAnalysis.score
      });
      
      // Check for auto-approval/rejection
      return await this.checkAutoProcessing(workflow, paymentItem, context, aiConfig);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      
      // Mark AI step as failed but continue workflow
      const aiStep = workflow.steps.find(s => s.role === UserRole.Admin);
      if (aiStep) {
        aiStep.status = 'skipped';
        aiStep.comments = 'ИИ-анализ недоступен';
      }
      
      workflow.current_status = ApprovalStatus.ForemanReview;
      workflow.updated_at = new Date().toISOString();
      
      return workflow;
    }
  }
  
  // 3. Process manual approval step
  static async processApprovalStep(
    workflow: PaymentApprovalWorkflow,
    action: ApprovalAction,
    performedBy: string,
    comments?: string,
    aiConfig?: AIConfiguration,
    context?: PaymentContext,
    paymentItem?: EstimatePaymentScheduleItem
  ): Promise<PaymentApprovalWorkflow> {
    const previousStatus = workflow.current_status;
    const now = new Date().toISOString();
    
    // Find current step
    const currentStep = this.getCurrentStep(workflow);
    if (!currentStep) {
      throw new Error('No active step found in workflow');
    }
    
    // Update step
    currentStep.status = 'completed';
    currentStep.completed_at = now;
    currentStep.completed_by = performedBy;
    currentStep.comments = comments;
    
    // Determine new status
    let newStatus = previousStatus;
    
    switch (action) {
      case ApprovalAction.ForemanApprove:
        newStatus = ApprovalStatus.ManagerReview;
        break;
      case ApprovalAction.ForemanReject:
        newStatus = ApprovalStatus.Rejected;
        break;
      case ApprovalAction.ManagerApprove:
        newStatus = ApprovalStatus.DirectorApproval;
        break;
      case ApprovalAction.ManagerReject:
        newStatus = ApprovalStatus.Rejected;
        break;
      case ApprovalAction.DirectorApprove:
        newStatus = ApprovalStatus.Approved;
        break;
      case ApprovalAction.DirectorReject:
        newStatus = ApprovalStatus.Rejected;
        break;
    }
    
    workflow.current_status = newStatus;
    workflow.updated_at = now;
    
    // Add history entry
    workflow.history.push({
      id: uuidv4(),
      workflow_id: workflow.id,
      action,
      performed_by: performedBy,
      performed_at: now,
      previous_status: previousStatus,
      new_status: newStatus,
      comments,
      ai_score_at_time: workflow.ai_analysis?.score
    });
    
    // Set final decision if approved/rejected
    if (newStatus === ApprovalStatus.Approved || newStatus === ApprovalStatus.Rejected) {
      workflow.final_decision = {
        approved_by: performedBy,
        approved_at: now,
        decision: newStatus === ApprovalStatus.Approved ? 'approve' : 'reject',
        final_comments: comments || ''
      };
    }
    
    // Move to next step if not final
    if (newStatus !== ApprovalStatus.Approved && newStatus !== ApprovalStatus.Rejected) {
      const nextStep = this.getNextStep(workflow);
      if (nextStep) {
        nextStep.status = 'pending';
      }
    }
    
    return workflow;
  }
  
  // 4. Get user's pending workflows
  static getPendingWorkflows(workflows: PaymentApprovalWorkflow[], user: User): PaymentApprovalWorkflow[] {
    return workflows.filter(workflow => {
      const currentStep = this.getCurrentStep(workflow);
      return currentStep && currentStep.role === user.role && currentStep.status === 'pending';
    });
  }
  
  // 5. Check if user can approve workflow
  static canUserApprove(workflow: PaymentApprovalWorkflow, user: User): boolean {
    const currentStep = this.getCurrentStep(workflow);
    return currentStep && currentStep.role === user.role && currentStep.status === 'pending';
  }
  
  // 5. Get workflow statistics
  static getWorkflowStats(workflows: PaymentApprovalWorkflow[]): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    average_ai_score?: number;
    average_processing_time?: number;
  } {
    const stats: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      average_ai_score?: number;
      average_processing_time?: number;
    } = {
      total: workflows.length,
      pending: workflows.filter(w => w.current_status !== ApprovalStatus.Approved && w.current_status !== ApprovalStatus.Rejected).length,
      approved: workflows.filter(w => w.current_status === ApprovalStatus.Approved).length,
      rejected: workflows.filter(w => w.current_status === ApprovalStatus.Rejected).length
    };
    
    // Calculate average AI score
    const workflowsWithScore = workflows.filter(w => w.ai_analysis);
    if (workflowsWithScore.length > 0) {
      stats.average_ai_score = workflowsWithScore.reduce((sum, w) => sum + w.ai_analysis!.score, 0) / workflowsWithScore.length;
    }
    
    // Calculate average processing time
    const completedWorkflows = workflows.filter(w => w.final_decision);
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, w) => {
        const created = new Date(w.created_at).getTime();
        const completed = new Date(w.final_decision!.approved_at).getTime();
        return sum + (completed - created);
      }, 0);
      stats.average_processing_time = totalTime / completedWorkflows.length / (1000 * 60 * 60); // Convert to hours
    }
    
    return stats;
  }
  
  // Helper methods
  private static buildWorkflowSteps(paymentItem: EstimatePaymentScheduleItem, config: ApprovalWorkflowConfig): ApprovalStep[] {
    const steps: ApprovalStep[] = [];
    
    // AI Analysis step (always first if enabled)
    if (config.auto_ai_analysis) {
      steps.push({
        id: uuidv4(),
        role: UserRole.Admin, // Using Admin as AI role
        required: true,
        status: 'pending'
      });
    }
    
    // Skip steps for small amounts if configured
    const shouldSkipSteps = paymentItem.amount < config.skip_steps_for_amount;
    
    // Foreman approval
    if (config.require_foreman_approval && !shouldSkipSteps) {
      steps.push({
        id: uuidv4(),
        role: UserRole.Foreman,
        required: true,
        status: 'pending'
      });
    }
    
    // Manager approval
    if (config.require_manager_approval && !shouldSkipSteps) {
      steps.push({
        id: uuidv4(),
        role: UserRole.ProjectManager,
        required: true,
        status: 'pending'
      });
    }
    
    // Director approval
    if (config.require_director_approval && !shouldSkipSteps) {
      steps.push({
        id: uuidv4(),
        role: UserRole.Director,
        required: true,
        status: 'pending'
      });
    }
    
    return steps;
  }
  
  private static getAIRecommendation(score: number): 'approve' | 'review' | 'reject' {
    if (score >= 90) return 'approve';
    if (score >= 50) return 'review';
    return 'reject';
  }
  
  private static async checkAutoProcessing(
    workflow: PaymentApprovalWorkflow,
    paymentItem: EstimatePaymentScheduleItem,
    context: PaymentContext,
    aiConfig: AIConfiguration
  ): Promise<PaymentApprovalWorkflow> {
    const score = workflow.ai_analysis?.score || 0;
    const config = this.getDefaultConfig(); // Should be passed as parameter
    
    // Auto-approval for high scores
    if (score >= config.auto_approve_threshold) {
      workflow.current_status = ApprovalStatus.Approved;
      workflow.final_decision = {
        approved_by: 'AI-System',
        approved_at: new Date().toISOString(),
        decision: 'approve',
        final_comments: `Авто-одобрение на основе ИИ-оценки ${score}/100`
      };
      
      workflow.history.push({
        id: uuidv4(),
        workflow_id: workflow.id,
        action: ApprovalAction.DirectorApprove,
        performed_by: 'AI-System',
        performed_at: new Date().toISOString(),
        previous_status: ApprovalStatus.AIAnalysis,
        new_status: ApprovalStatus.Approved,
        comments: `Авто-одобрение: ИИ-оценка ${score}/100 превышает порог ${config.auto_approve_threshold}`
      });
      
      return workflow;
    }
    
    // Auto-rejection for low scores
    if (score <= config.auto_reject_threshold) {
      workflow.current_status = ApprovalStatus.Rejected;
      workflow.final_decision = {
        approved_by: 'AI-System',
        approved_at: new Date().toISOString(),
        decision: 'reject',
        final_comments: `Авто-отклонение на основе ИИ-оценки ${score}/100`
      };
      
      workflow.history.push({
        id: uuidv4(),
        workflow_id: workflow.id,
        action: ApprovalAction.DirectorReject,
        performed_by: 'AI-System',
        performed_at: new Date().toISOString(),
        previous_status: ApprovalStatus.AIAnalysis,
        new_status: ApprovalStatus.Rejected,
        comments: `Авто-отклонение: ИИ-оценка ${score}/100 ниже порога ${config.auto_reject_threshold}`
      });
      
      return workflow;
    }
    
    // Continue to manual review
    workflow.current_status = ApprovalStatus.ForemanReview;
    const nextStep = this.getNextStep(workflow);
    if (nextStep) {
      nextStep.status = 'pending';
    }
    
    return workflow;
  }
  
  private static getCurrentStep(workflow: PaymentApprovalWorkflow): ApprovalStep | undefined {
    return workflow.steps.find(step => step.status === 'pending');
  }
  
  private static getNextStep(workflow: PaymentApprovalWorkflow): ApprovalStep | undefined {
    const pendingIndex = workflow.steps.findIndex(step => step.status === 'pending');
    return pendingIndex >= 0 && pendingIndex < workflow.steps.length - 1 
      ? workflow.steps[pendingIndex + 1] 
      : undefined;
  }
  
  private static getDefaultConfig(): ApprovalWorkflowConfig {
    return {
      enabled: true,
      auto_ai_analysis: true,
      require_foreman_approval: true,
      require_manager_approval: true,
      require_director_approval: false, // Only for large amounts
      auto_approve_threshold: 90,
      auto_reject_threshold: 25,
      skip_steps_for_amount: 50000 // Skip steps for payments under 50k
    };
  }
}

// Export main service interface
export const ApprovalWorkflowServiceAPI = {
  createWorkflow: ApprovalWorkflowService.createWorkflow,
  processApprovalStep: ApprovalWorkflowService.processApprovalStep,
  getPendingWorkflows: ApprovalWorkflowService.getPendingWorkflows,
  canUserApprove: ApprovalWorkflowService.canUserApprove,
  getWorkflowStats: ApprovalWorkflowService.getWorkflowStats
};
