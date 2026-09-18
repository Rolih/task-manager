import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:8081/api',
);

void main() {
  runApp(const TaskManagerApp());
}

class TaskManagerApp extends StatelessWidget {
  const TaskManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Task Manager',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

class ApiClient {
  final Dio dio = Dio(
    BaseOptions(
      baseUrl: apiBaseUrl,
      headers: {'Content-Type': 'application/json'},
    ),
  );

  String? token;

  void setToken(String value) {
    token = value;
    dio.options.headers['Authorization'] = 'Bearer $value';
  }

  Future<String> login(String email, String password) async {
    final response = await dio.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return response.data['token'] as String;
  }

  Future<String> register(String email, String password) async {
    final response = await dio.post(
      '/auth/register',
      data: {'email': email, 'password': password},
    );
    return response.data['token'] as String;
  }

  Future<List<Task>> getTasks() async {
    final response = await dio.get('/tasks');
    return (response.data as List)
        .map((item) => Task.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Task> createTask({
    required String title,
    required String description,
    required String status,
  }) async {
    final response = await dio.post(
      '/tasks',
      data: {
        'title': title,
        'description': description,
        'status': status,
      },
    );
    return Task.fromJson(response.data);
  }

  Future<void> deleteTask(int id) async {
    await dio.delete('/tasks/$id');
  }
}

final api = ApiClient();

class Task {
  final int id;
  final String title;
  final String description;
  final String status;
  final DateTime createdAt;

  Task({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as int,
      title: json['title'] as String,
      description: (json['description'] as String?) ?? '',
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  bool registerMode = false;
  bool loading = false;
  String? error;

  Future<void> submit() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final token = registerMode
          ? await api.register(emailController.text.trim(), passwordController.text)
          : await api.login(emailController.text.trim(), passwordController.text);

      api.setToken(token);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const TaskListPage()),
      );
    } on DioException catch (e) {
      setState(() {
        error = e.response?.data?['message']?.toString() ??
            'Impossible de contacter le serveur.';
      });
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 52),
                    const SizedBox(height: 12),
                    Text(
                      'Task Manager',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 24),
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: false, label: Text('Connexion')),
                        ButtonSegment(value: true, label: Text('Inscription')),
                      ],
                      selected: {registerMode},
                      onSelectionChanged: (value) {
                        setState(() => registerMode = value.first);
                      },
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Mot de passe',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 14),
                      Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: loading ? null : submit,
                      child: Text(
                        loading
                            ? 'Chargement…'
                            : registerMode
                                ? 'Créer mon compte'
                                : 'Se connecter',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class TaskListPage extends StatefulWidget {
  const TaskListPage({super.key});

  @override
  State<TaskListPage> createState() => _TaskListPageState();
}

class _TaskListPageState extends State<TaskListPage> {
  List<Task> tasks = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    loadTasks();
  }

  Future<void> loadTasks() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final result = await api.getTasks();
      setState(() => tasks = result);
    } on DioException catch (e) {
      setState(() {
        error = e.response?.data?['message']?.toString() ?? 'Erreur de chargement.';
      });
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> create() async {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    String status = 'TODO';

    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Nouvelle tâche'),
              content: SingleChildScrollView(
                child: Column(
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Titre'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Description'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: status,
                      decoration: const InputDecoration(labelText: 'Statut'),
                      items: const [
                        DropdownMenuItem(value: 'TODO', child: Text('À faire')),
                        DropdownMenuItem(value: 'IN_PROGRESS', child: Text('En cours')),
                        DropdownMenuItem(value: 'DONE', child: Text('Terminée')),
                      ],
                      onChanged: (value) {
                        if (value != null) setDialogState(() => status = value);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.trim().isEmpty) return;
                    try {
                      await api.createTask(
                        title: titleController.text.trim(),
                        description: descriptionController.text.trim(),
                        status: status,
                      );
                      if (context.mounted) Navigator.pop(context, true);
                    } catch (_) {
                      // La page principale affichera l'erreur au prochain chargement.
                      if (context.mounted) Navigator.pop(context, false);
                    }
                  },
                  child: const Text('Créer'),
                ),
              ],
            );
          },
        );
      },
    );

    if (result == true) await loadTasks();
  }

  Future<void> remove(Task task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la tâche ?'),
        content: Text(task.title),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    await api.deleteTask(task.id);
    await loadTasks();
  }

  String statusLabel(String status) {
    switch (status) {
      case 'IN_PROGRESS':
        return 'En cours';
      case 'DONE':
        return 'Terminée';
      default:
        return 'À faire';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes tâches'),
        actions: [
          IconButton(onPressed: loadTasks, icon: const Icon(Icons.refresh)),
          IconButton(
            onPressed: () {
              api.token = null;
              api.dio.options.headers.remove('Authorization');
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginPage()),
                (_) => false,
              );
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: create,
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle tâche'),
      ),
      body: RefreshIndicator(
        onRefresh: loadTasks,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
                ? ListView(
                    children: [
                      const SizedBox(height: 180),
                      Center(child: Text(error!)),
                    ],
                  )
                : tasks.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 180),
                          Center(child: Text('Aucune tâche.')),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: tasks.length,
                        itemBuilder: (context, index) {
                          final task = tasks[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              title: Text(
                                task.title,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  '${statusLabel(task.status)}\n${task.description}',
                                ),
                              ),
                              isThreeLine: true,
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () => remove(task),
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
