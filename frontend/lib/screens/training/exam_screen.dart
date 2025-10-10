import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_colors.dart';
import '../../services/training_service.dart';

/// 考试页面 - 答题界面
class ExamScreen extends StatefulWidget {
  final int courseId;

  const ExamScreen({super.key, required this.courseId});

  @override
  State<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends State<ExamScreen> {
  final TrainingService _trainingService = TrainingService();
  final PageController _pageController = PageController();

  bool _isLoading = true;
  String? _errorMessage;

  String? _courseTitle;
  List<Map<String, dynamic>> _questions = [];
  int _totalScore = 0;
  int _currentPage = 0;

  // 用户答案：{"question_id": "answer"}
  final Map<String, String> _answers = {};

  @override
  void initState() {
    super.initState();
    _loadExamQuestions();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  /// 加载考试题目
  Future<void> _loadExamQuestions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final examData = await _trainingService.getExamQuestions(widget.courseId);

      setState(() {
        _courseTitle = examData['course_title'];
        _questions = List<Map<String, dynamic>>.from(examData['questions']);
        _totalScore = examData['total_score'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  /// 提交考试
  Future<void> _submitExam() async {
    // 检查是否有未答题
    final unansweredQuestions = _questions.where((q) {
      final questionId = q['id'].toString();
      return !_answers.containsKey(questionId) ||
          _answers[questionId]!.isEmpty;
    }).toList();

    if (unansweredQuestions.isNotEmpty) {
      final shouldSubmit = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('提示'),
          content: Text('还有 ${unansweredQuestions.length} 道题未作答，确定要提交吗？'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('再检查一下'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('确定提交'),
            ),
          ],
        ),
      );

      if (shouldSubmit != true) return;
    }

    // 显示加载对话框
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('正在提交答案...'),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      await _trainingService.submitExam(widget.courseId, _answers);

      if (!mounted) return;
      Navigator.pop(context); // 关闭加载对话框

      // 显示成功对话框
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.success, size: 28.w),
              SizedBox(width: 8.w),
              const Text('提交成功'),
            ],
          ),
          content: const Text(
            '考试已提交！\n\n客观题已自动判分，主观题将由管理员审核后评分。请耐心等待审核结果。',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // 关闭对话框
                Navigator.pop(context, true); // 返回课程详情页，刷新数据
              },
              child: const Text('确定'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // 关闭加载对话框

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('提交失败: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('考试'),
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('考试'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64.w,
                color: AppColors.error,
              ),
              SizedBox(height: 16.h),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 32.w),
                child: Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14.sp),
                ),
              ),
              SizedBox(height: 24.h),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('返回'),
              ),
            ],
          ),
        ),
      );
    }

    return WillPopScope(
      onWillPop: () async {
        final shouldExit = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('确认退出'),
            content: const Text('退出后答题记录将不会保存，确定要退出吗？'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('继续答题'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('确定退出'),
              ),
            ],
          ),
        );
        return shouldExit ?? false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_courseTitle ?? '考试'),
          actions: [
            // 答题进度
            Center(
              child: Padding(
                padding: EdgeInsets.only(right: 16.w),
                child: Text(
                  '${_currentPage + 1}/${_questions.length}',
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            // 进度条
            LinearProgressIndicator(
              value: (_currentPage + 1) / _questions.length,
              backgroundColor: Colors.grey.shade200,
              minHeight: 4.h,
            ),

            // 题目内容
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _questions.length,
                itemBuilder: (context, index) {
                  return _buildQuestionPage(_questions[index], index);
                },
              ),
            ),

            // 底部导航按钮
            Container(
              padding: EdgeInsets.all(16.w),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // 上一题按钮
                  if (_currentPage > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          _pageController.previousPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        },
                        child: const Text('上一题'),
                      ),
                    ),

                  if (_currentPage > 0) SizedBox(width: 12.w),

                  // 下一题/提交按钮
                  Expanded(
                    child: _currentPage < _questions.length - 1
                        ? ElevatedButton(
                            onPressed: () {
                              _pageController.nextPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: const Text('下一题'),
                          )
                        : ElevatedButton(
                            onPressed: _submitExam,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                            ),
                            child: const Text('提交考试'),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建题目页面
  Widget _buildQuestionPage(Map<String, dynamic> question, int index) {
    final questionId = question['id'].toString();
    final questionType = question['question_type'];
    final isSubjective = question['is_subjective'] ?? false;
    final score = question['score'] ?? 10;

    return SingleChildScrollView(
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 题目标题
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: Text(
                  '第${index + 1}题',
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              SizedBox(width: 8.w),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: Text(
                  '$score分',
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: Colors.orange,
                  ),
                ),
              ),
              SizedBox(width: 8.w),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 6.h),
                decoration: BoxDecoration(
                  color: isSubjective
                      ? Colors.purple.withOpacity(0.1)
                      : Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: Text(
                  _getQuestionTypeText(questionType),
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: isSubjective ? Colors.purple : Colors.blue,
                  ),
                ),
              ),
            ],
          ),

          SizedBox(height: 16.h),

          // 题目内容
          Text(
            question['question_text'] ?? '',
            style: TextStyle(
              fontSize: 16.sp,
              height: 1.5,
            ),
          ),

          SizedBox(height: 24.h),

          // 答题区域
          if (isSubjective)
            _buildSubjectiveAnswer(questionId)
          else
            _buildObjectiveAnswer(question, questionId),
        ],
      ),
    );
  }

  /// 构建客观题答题区（单选/多选/判断）
  Widget _buildObjectiveAnswer(Map<String, dynamic> question, String questionId) {
    final questionType = question['question_type'];
    final options = question['options'] as List?;

    if (options == null || options.isEmpty) {
      return const Text('题目选项错误');
    }

    final currentAnswer = _answers[questionId] ?? '';

    if (questionType == 'single_choice' || questionType == 'true_false') {
      // 单选题和判断题
      return Column(
        children: options.map<Widget>((option) {
          final optionValue = option.toString();
          final isSelected = currentAnswer == optionValue;

          return GestureDetector(
            onTap: () {
              setState(() {
                _answers[questionId] = optionValue;
              });
            },
            child: Container(
              margin: EdgeInsets.only(bottom: 12.h),
              padding: EdgeInsets.all(16.w),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isSelected ? AppColors.primary : Colors.grey.shade300,
                  width: isSelected ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8.r),
                color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.white,
              ),
              child: Row(
                children: [
                  Icon(
                    isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                    color: isSelected ? AppColors.primary : Colors.grey,
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: Text(
                      optionValue,
                      style: TextStyle(
                        fontSize: 15.sp,
                        color: isSelected ? AppColors.primary : Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      );
    } else if (questionType == 'multiple_choice') {
      // 多选题
      final selectedOptions = currentAnswer.split(',').where((s) => s.isNotEmpty).toSet();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '多选题（选择多个答案，用逗号分隔）',
            style: TextStyle(
              fontSize: 13.sp,
              color: AppColors.textSecondary,
            ),
          ),
          SizedBox(height: 12.h),
          ...options.map<Widget>((option) {
            final optionValue = option.toString();
            final isSelected = selectedOptions.contains(optionValue);

            return GestureDetector(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    selectedOptions.remove(optionValue);
                  } else {
                    selectedOptions.add(optionValue);
                  }
                  _answers[questionId] = selectedOptions.join(',');
                });
              },
              child: Container(
                margin: EdgeInsets.only(bottom: 12.h),
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isSelected ? AppColors.primary : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8.r),
                  color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.white,
                ),
                child: Row(
                  children: [
                    Icon(
                      isSelected ? Icons.check_box : Icons.check_box_outline_blank,
                      color: isSelected ? AppColors.primary : Colors.grey,
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Text(
                        optionValue,
                        style: TextStyle(
                          fontSize: 15.sp,
                          color: isSelected ? AppColors.primary : Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      );
    }

    return const SizedBox.shrink();
  }

  /// 构建主观题答题区
  Widget _buildSubjectiveAnswer(String questionId) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '请在下方输入您的答案：',
          style: TextStyle(
            fontSize: 14.sp,
            color: AppColors.textSecondary,
          ),
        ),
        SizedBox(height: 12.h),
        TextField(
          maxLines: 8,
          decoration: InputDecoration(
            hintText: '请输入您的答案...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8.r),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8.r),
              borderSide: BorderSide(color: AppColors.primary, width: 2),
            ),
          ),
          onChanged: (value) {
            _answers[questionId] = value;
          },
          controller: TextEditingController(text: _answers[questionId] ?? '')
            ..selection = TextSelection.fromPosition(
              TextPosition(offset: (_answers[questionId] ?? '').length),
            ),
        ),
      ],
    );
  }

  String _getQuestionTypeText(String type) {
    switch (type) {
      case 'single_choice':
        return '单选题';
      case 'multiple_choice':
        return '多选题';
      case 'true_false':
        return '判断题';
      case 'subjective':
        return '主观题';
      default:
        return '未知类型';
    }
  }
}

