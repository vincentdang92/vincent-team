import 'package:flutter/material.dart';
import 'package:speed_test_network/speed_test_network.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Network Speed Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const NetworkSpeedTestScreen(),
    );
  }
}

class NetworkSpeedTestScreen extends StatefulWidget {
  const NetworkSpeedTestScreen({super.key});

  @override
  State<NetworkSpeedTestScreen> createState() => _NetworkSpeedTestScreenState();
}

class _NetworkSpeedTestScreenState extends State<NetworkSpeedTestScreen> {
  String _downloadSpeed = 'N/A';
  String _uploadSpeed = 'N/A';
  bool _isTesting = false;
  String _statusMessage = 'Tap "Start Test" to begin.';

  Future<void> _startSpeedTest() async {
    setState(() {
      _isTesting = true;
      _downloadSpeed = '---';
      _uploadSpeed = '---';
      _statusMessage = 'Searching for best server...';
    });

    try {
      final String? serverSelection = await SpeedTestNetwork().findBestServer();
      if (serverSelection == null) {
        setState(() {
          _statusMessage = 'Could not find a suitable server.';
          _isTesting = false;
        });
        return;
      }

      setState(() {
        _statusMessage = 'Testing download speed...';
      });
      final double? downloadSpeed = await SpeedTestNetwork().testDownloadSpeed(serverSelection: serverSelection);
      setState(() {
        _downloadSpeed = downloadSpeed != null ? '${(downloadSpeed / 1000000).toStringAsFixed(2)} Mbps' : 'Error';
        _statusMessage = 'Testing upload speed...';
      });

      final double? uploadSpeed = await SpeedTestNetwork().testUploadSpeed(serverSelection: serverSelection);
      setState(() {
        _uploadSpeed = uploadSpeed != null ? '${(uploadSpeed / 1000000).toStringAsFixed(2)} Mbps' : 'Error';
        _statusMessage = 'Test complete!';
        _isTesting = false;
      });

    } catch (e) {
      setState(() {
        _statusMessage = 'An error occurred: ${e.toString()}';
        _isTesting = false;
        _downloadSpeed = 'Error';
        _uploadSpeed = 'Error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Network Speed Test'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(
                'Download Speed',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                _downloadSpeed,
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 30),
              Text(
                'Upload Speed',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                _uploadSpeed,
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 50),
              Text(
                _statusMessage,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isTesting ? null : _startSpeedTest,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    _isTesting ? 'Testing...' : 'Start Test',
                    style: TextStyle(fontSize: 18),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
