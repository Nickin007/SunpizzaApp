import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../services/training_service.dart';

/// 课程详情页 - 视频+文档+考试
class CourseDetailScreen extends StatefulWidget {
  final int courseId;

  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TrainingService _trainingService = TrainingService();

  Map<String, dynamic>? _courseData;
  bool _isLoading = true;
  String? _errorMessage;

  // 视频播放器
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;

  final List<Map<String, dynamic>> _tabs = [
    {'title': '视频学习', 'icon': Icons.play_circle_outline},
    {'title': '文档阅读', 'icon': Icons.description_outlined},
    {'title': '课程考试', 'icon': Icons.quiz_outlined},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadCourseDetail();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _videoController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  /// 加载课程详情
  Future<void> _loadCourseDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final courseData = await _trainingService.getCourseDetail(widget.courseId);

      setState(() {
        _courseData = courseData;
        _isLoading = false;
      });

      // 如果有视频，初始化视频播放器
      if (courseData['video_url'] != null && courseData['video_url'].toString().isNotEmpty) {
        _initializeVideoPlayer(courseData['video_url']);
      }

      // 自动开始学习记录
      if (courseData['learning_record'] == null) {
        await _trainingService.startLearning(widget.courseId);
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  /// 初始化视频播放器
  Future<void> _initializeVideoPlayer(String videoUrl) async {
    try {
      _videoController = VideoPlayerController.network(videoUrl);
      await _videoController!.initialize();

      // 使用视频的实际宽高比，自动适应横屏/竖屏视频
      final videoAspectRatio = _videoController!.value.aspectRatio;

      _chewieController = ChewieController(
        videoPlayerController: _videoController!,
        autoPlay: false,
        looping: false,
        aspectRatio: videoAspectRatio, // 使用视频的实际宽高比
        placeholder: Container(
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        ),
        errorBuilder: (context, errorMessage) {
          return Center(
            child: Text(
              '视频加载失败: $errorMessage',
              style: const TextStyle(color: Colors.white),
            ),
          );
        },
      );

      // 监听播放进度，定期保存
      _videoController!.addListener(_onVideoProgress);

      setState(() {});
    } catch (e) {
      print('视频初始化失败: $e');
    }
  }

  /// 视频进度监听
  void _onVideoProgress() {
    if (_videoController != null && _videoController!.value.isPlaying) {
      final position = _videoController!.value.position.inSeconds;
      // 每10秒保存一次进度
      if (position % 10 == 0) {
        _trainingService.updateVideoProgress(widget.courseId, position);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('课程详情'),
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('课程详情'),
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
              Text(
                '加载失败',
                style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8.h),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 32.w),
                child: Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              SizedBox(height: 24.h),
              ElevatedButton(
                onPressed: _loadCourseDetail,
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_courseData!['title'] ?? '课程详情'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(48.h),
          child: Container(
            color: AppColors.surface,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: Colors.transparent,
              indicatorWeight: 0.1,
              tabs: _tabs.map((tab) {
                return Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(tab['icon'], size: 18.w),
                      SizedBox(width: 4.w),
                      Text(tab['title']),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildVideoTab(),
          _buildDocumentTab(),
          _buildExamTab(),
        ],
      ),
    );
  }

  /// 视频学习Tab
  Widget _buildVideoTab() {
    final videoUrl = _courseData!['video_url'];

    if (videoUrl == null || videoUrl.toString().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.videocam_off_outlined,
              size: 64.w,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16.h),
            Text(
              '该课程暂无视频',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    if (_chewieController == null) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // 获取视频的实际宽高比，如果未初始化则使用默认值16:9
    final aspectRatio = _videoController != null && _videoController!.value.isInitialized
        ? _videoController!.value.aspectRatio
        : 16 / 9;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 视频播放器 - 使用视频的实际宽高比
          AspectRatio(
            aspectRatio: aspectRatio,
            child: Container(
              color: Colors.black,
              child: Chewie(controller: _chewieController!),
            ),
          ),
          
          Padding(
            padding: EdgeInsets.all(16.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _courseData!['title'] ?? '',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8.h),
                Text(
                  _courseData!['description'] ?? '',
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
                SizedBox(height: 16.h),
                _buildLearningProgress(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 文档阅读Tab
  Widget _buildDocumentTab() {
    final documentContent = _courseData!['document_content'];

    if (documentContent == null || documentContent.toString().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 64.w,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16.h),
            Text(
              '该课程暂无文档',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 富文本内容
          Html(
            data: documentContent,
            style: {
              "body": Style(
                fontSize: FontSize(14.sp),
                lineHeight: const LineHeight(1.6),
              ),
              "h1": Style(
                fontSize: FontSize(24.sp),
                fontWeight: FontWeight.bold,
                margin: Margins.only(top: 16, bottom: 8),
              ),
              "h2": Style(
                fontSize: FontSize(20.sp),
                fontWeight: FontWeight.bold,
                margin: Margins.only(top: 14, bottom: 8),
              ),
              "h3": Style(
                fontSize: FontSize(18.sp),
                fontWeight: FontWeight.bold,
                margin: Margins.only(top: 12, bottom: 8),
              ),
              "p": Style(
                margin: Margins.only(bottom: 12),
              ),
              "img": Style(
                width: Width(1.sw - 32.w),
              ),
            },
          ),
          
          SizedBox(height: 24.h),
          
          // 标记为已读按钮
          if (_courseData!['learning_record'] != null &&
              _courseData!['learning_record']['document_read'] != true)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  await _trainingService.markDocumentRead(widget.courseId);
                  setState(() {
                    _courseData!['learning_record']['document_read'] = true;
                  });
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('已标记为已读')),
                    );
                  }
                },
                child: const Text('标记为已读'),
              ),
            ),
        ],
      ),
    );
  }

  /// 课程考试Tab
  Widget _buildExamTab() {
    final hasExam = _courseData!['has_exam'] ?? false;
    final examSubmission = _courseData!['exam_submission'];

    if (!hasExam) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.quiz_outlined,
              size: 64.w,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16.h),
            Text(
              '该课程暂无考试',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '课程考试',
            style: TextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 16.h),
          
          // 考试状态卡片
          _buildExamStatusCard(examSubmission),
          
          SizedBox(height: 24.h),
          
          // 操作按钮
          if (examSubmission == null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // 跳转到考试页面
                  context.push('/exam/${widget.courseId}').then((result) {
                    if (result == true) {
                      // 考试提交成功，刷新数据
                      _loadCourseDetail();
                    }
                  });
                },
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16.h),
                ),
                child: Text(
                  '开始考试',
                  style: TextStyle(fontSize: 16.sp),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// 学习进度卡片
  Widget _buildLearningProgress() {
    final learningRecord = _courseData!['learning_record'];
    
    if (learningRecord == null) {
      return const SizedBox.shrink();
    }

    final videoProgress = learningRecord['video_progress'] ?? 0;
    final documentRead = learningRecord['document_read'] ?? false;

    return Card(
      child: Padding(
        padding: EdgeInsets.all(16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '学习进度',
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 12.h),
            Row(
              children: [
                Icon(Icons.play_circle_outline, size: 20.w, color: AppColors.primary),
                SizedBox(width: 8.w),
                Text('视频观看：${_formatDuration(videoProgress)}'),
              ],
            ),
            SizedBox(height: 8.h),
            Row(
              children: [
                Icon(
                  documentRead ? Icons.check_circle : Icons.radio_button_unchecked,
                  size: 20.w,
                  color: documentRead ? AppColors.success : AppColors.textSecondary,
                ),
                SizedBox(width: 8.w),
                Text(documentRead ? '文档已阅读' : '文档未阅读'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 考试状态卡片
  Widget _buildExamStatusCard(Map<String, dynamic>? examSubmission) {
    if (examSubmission == null) {
      return Card(
        color: Colors.blue.shade50,
        child: Padding(
          padding: EdgeInsets.all(16.w),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue, size: 24.w),
              SizedBox(width: 12.w),
              Expanded(
                child: Text(
                  '您还未参加考试',
                  style: TextStyle(fontSize: 14.sp),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final status = examSubmission['status'];
    final objectiveScore = examSubmission['objective_score'] ?? 0;
    final subjectiveScore = examSubmission['subjective_score'] ?? 0;
    final totalScore = examSubmission['total_score'] ?? 0;

    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (status) {
      case 'passed':
        statusColor = AppColors.success;
        statusText = '考试通过';
        statusIcon = Icons.check_circle;
        break;
      case 'failed':
        statusColor = AppColors.error;
        statusText = '考试未通过';
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = Colors.orange;
        statusText = '待审核';
        statusIcon = Icons.pending;
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 24.w),
                SizedBox(width: 8.w),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16.h),
            _buildScoreRow('客观题得分', objectiveScore),
            SizedBox(height: 8.h),
            _buildScoreRow('主观题得分', subjectiveScore, isPending: status == 'pending_review'),
            Divider(height: 24.h),
            _buildScoreRow('总分', totalScore, isTotal: true),
            if (examSubmission['feedback'] != null && examSubmission['feedback'].toString().isNotEmpty) ...[
              SizedBox(height: 16.h),
              Text(
                '审核反馈：',
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 4.h),
              Text(
                examSubmission['feedback'],
                style: TextStyle(fontSize: 14.sp),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildScoreRow(String label, int score, {bool isPending = false, bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 16.sp : 14.sp,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          isPending ? '待审核' : '$score 分',
          style: TextStyle(
            fontSize: isTotal ? 18.sp : 14.sp,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: isPending ? Colors.orange : (isTotal ? AppColors.primary : null),
          ),
        ),
      ],
    );
  }

  String _formatDuration(int seconds) {
    final duration = Duration(seconds: seconds);
    final minutes = duration.inMinutes;
    final remainingSeconds = seconds % 60;
    return '$minutes:${remainingSeconds.toString().padLeft(2, '0')}';
  }
}


