using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Collections.Generic;
using OVRSharp;
using Valve.VR;

namespace VROverlayApp
{
    // Terror ability info from Tauri
    public class TerrorAbility
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = "";

        [JsonPropertyName("value")]
        public string Value { get; set; } = "";
    }

    // Terror info from Tauri
    public class TerrorInfo
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("color")]
        public string? Color { get; set; }

        [JsonPropertyName("abilities")]
        public List<TerrorAbility> Abilities { get; set; } = new();
    }

    // Command types from Tauri
    public class VrCommand
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("terrors")]
        public List<TerrorInfo>? Terrors { get; set; }

        [JsonPropertyName("round_type")]
        public string? RoundType { get; set; }

        [JsonPropertyName("position")]
        public string? Position { get; set; }
    }

    public enum OverlayPosition
    {
        RightHand,
        LeftHand,
        Above
    }

    class Program
    {
        private static Application? _app;
        private static Overlay? _overlay;
        private static string _imagePath = "";
        private static OverlayPosition _currentPosition = OverlayPosition.RightHand;
        private static List<TerrorInfo> _currentTerrors = new();
        private static string _currentRoundType = "";
        private static bool _isVisible = false;

        static void Main(string[] args)
        {
            Console.WriteLine("[VROverlay] Starting...");

            TrySetConsoleEncoding();

            // Parse command line arguments
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--position" && i + 1 < args.Length)
                {
                    _currentPosition = args[i + 1].ToLower() switch
                    {
                        "left" => OverlayPosition.LeftHand,
                        "above" => OverlayPosition.Above,
                        _ => OverlayPosition.RightHand
                    };
                    Console.WriteLine($"[VROverlay] Position set to: {_currentPosition}");
                }
            }

            try
            {
                // Initialize OpenVR
                _app = new Application(Application.ApplicationType.Overlay);
                _overlay = new Overlay("tsst-vr-overlay", "ToN Terror Info");

                // Set up image path
                _imagePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "overlay.png");
                
                // Create initial empty overlay
                CreateOverlayImage(_imagePath, new List<TerrorInfo>(), "");
                _overlay.SetTextureFromFile(_imagePath);
                _overlay.WidthInMeters = 0.12f;

                // Set initial position
                UpdateOverlayPosition();

                Console.WriteLine("[VROverlay] Initialized successfully");

                // Start stdin reading thread
                bool running = true;
                Thread inputThread = new Thread(() =>
                {
                    while (running)
                    {
                        try
                        {
                            string? line = Console.ReadLine();
                            if (line == null)
                            {
                                Thread.Sleep(100);
                                continue;
                            }

                            ProcessCommand(line);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[VROverlay] Input error: {ex.Message}");
                        }
                    }
                });
                inputThread.IsBackground = true;
                inputThread.Start();

                // Main loop
                while (running)
                {
                    // Check if we need to refresh the overlay texture
                    Thread.Sleep(100);
                }

                _app.Shutdown();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VROverlay] Error: {ex.Message}");
                Console.WriteLine("[VROverlay] Make sure SteamVR is running.");
            }
        }

        static void ProcessCommand(string line)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(line)) return;

                var trimmed = line.Trim();
                if (trimmed.Length > 0 && trimmed[0] == '\uFEFF')
                {
                    trimmed = trimmed.TrimStart('\uFEFF');
                }

                string json = trimmed;
                if (trimmed.StartsWith("b64:", StringComparison.OrdinalIgnoreCase))
                {
                    var payload = trimmed.Substring(4);
                    var bytes = Convert.FromBase64String(payload);
                    json = Encoding.UTF8.GetString(bytes);
                }

                Console.WriteLine($"[VROverlay] Received command: {json}");

                var command = JsonSerializer.Deserialize<VrCommand>(json);
                if (command == null)
                {
                    Console.WriteLine("[VROverlay] Command is null after deserialize");
                    return;
                }

                Console.WriteLine($"[VROverlay] Command type: {command.Type}");

                switch (command.Type)
                {
                    case "update_terrors":
                        if (command.Terrors != null)
                        {
                            Console.WriteLine($"[VROverlay] Terrors count: {command.Terrors.Count}");
                            foreach (var t in command.Terrors)
                            {
                                Console.WriteLine($"[VROverlay]   Terror: {t.Name}, Color: {t.Color}, Abilities: {t.Abilities.Count}");
                            }
                            _currentTerrors = command.Terrors;
                            _currentRoundType = command.RoundType ?? "";
                            UpdateOverlay();
                        }
                        else
                        {
                            Console.WriteLine("[VROverlay] Terrors is null");
                        }
                        break;

                    case "set_position":
                        if (command.Position != null)
                        {
                            _currentPosition = command.Position switch
                            {
                                "LeftHand" => OverlayPosition.LeftHand,
                                "Above" => OverlayPosition.Above,
                                _ => OverlayPosition.RightHand
                            };
                            UpdateOverlayPosition();
                        }
                        break;

                    case "clear":
                        _currentTerrors.Clear();
                        _currentRoundType = "";
                        HideOverlay();
                        break;

                    case "quit":
                        Console.WriteLine("[VROverlay] Quit command received");
                        Environment.Exit(0);
                        break;

                    default:
                        Console.WriteLine($"[VROverlay] Unknown command type: {command.Type}");
                        break;
                }
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"[VROverlay] JSON parse error: {ex.Message}");
                Console.WriteLine($"[VROverlay] Stack: {ex.StackTrace}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VROverlay] Error in ProcessCommand: {ex.Message}");
                Console.WriteLine($"[VROverlay] Stack: {ex.StackTrace}");
            }
        }

        static void TrySetConsoleEncoding()
        {
            try
            {
                Console.InputEncoding = Encoding.UTF8;
                Console.OutputEncoding = Encoding.UTF8;
            }
            catch
            {
                // Some environments (e.g., GUI subsystem or CI-built binaries) do not allow
                // setting console encodings. Ignore to keep the overlay running.
            }
        }

        static void UpdateOverlay()
        {
            try
            {
                if (_overlay == null)
                {
                    Console.WriteLine("[VROverlay] UpdateOverlay: overlay is null");
                    return;
                }

                if (_currentTerrors.Count == 0)
                {
                    HideOverlay();
                    return;
                }

                Console.WriteLine($"[VROverlay] Creating overlay image for {_currentTerrors.Count} terrors");
                CreateOverlayImage(_imagePath, _currentTerrors, _currentRoundType);
                Console.WriteLine($"[VROverlay] Image created at {_imagePath}");
                
                _overlay.SetTextureFromFile(_imagePath);
                Console.WriteLine("[VROverlay] Texture set");
                
                if (!_isVisible)
                {
                    _overlay.Show();
                    _isVisible = true;
                }

                Console.WriteLine($"[VROverlay] Updated with {_currentTerrors.Count} terrors");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VROverlay] Error in UpdateOverlay: {ex.Message}");
                Console.WriteLine($"[VROverlay] Stack: {ex.StackTrace}");
            }
        }

        static void HideOverlay()
        {
            if (_overlay != null && _isVisible)
            {
                _overlay.Hide();
                _isVisible = false;
                Console.WriteLine("[VROverlay] Hidden");
            }
        }

        static void UpdateOverlayPosition()
        {
            if (_overlay == null) return;

            switch (_currentPosition)
            {
                case OverlayPosition.RightHand:
                    AttachToController(_overlay, ETrackedControllerRole.RightHand);
                    break;

                case OverlayPosition.LeftHand:
                    AttachToController(_overlay, ETrackedControllerRole.LeftHand);
                    break;

                case OverlayPosition.Above:
                    AttachAboveHead(_overlay);
                    break;
            }

            Console.WriteLine($"[VROverlay] Position updated to: {_currentPosition}");
        }

        static void AttachToController(Overlay overlay, ETrackedControllerRole role)
        {
            uint deviceIndex = OpenVR.System.GetTrackedDeviceIndexForControllerRole(role);
            
            if (deviceIndex == OpenVR.k_unTrackedDeviceIndexInvalid)
            {
                // Fall back to absolute positioning if controller not found
                Console.WriteLine($"[VROverlay] Controller not found for {role}, using absolute position");
                var transform = new HmdMatrix34_t
                {
                    m0 = 1, m1 = 0, m2 = 0, m3 = role == ETrackedControllerRole.RightHand ? 0.3f : -0.3f,
                    m4 = 0, m5 = 1, m6 = 0, m7 = 1.0f,
                    m8 = 0, m9 = 0, m10 = 1, m11 = -0.5f
                };
                overlay.Transform = transform;
                return;
            }

            // Attach to controller in "Pulse" position (Inner Wrist)
            // Visible when rotating wrist so the inner side (pulse area) faces the eyes
            float xOffset, yOffset, zOffset;
            
            // Rotation Basis Vectors
            float r0, r1, r2; // Right (Local X)
            float u0, u1, u2; // Up (Local Y)
            float f0, f1, f2; // Face Normal (Local Z)

            // Tilt Correction Angle (Degrees)
            // Value > 0:
            //   Right Hand: Rotates Left (CCW)
            //   Left Hand:  Rotates Right (CW)
            float tiltAngle = 115.0f; 
            float rad = tiltAngle * (float)Math.PI / 180.0f;
            float cos = (float)Math.Cos(rad);
            float sin = (float)Math.Sin(rad);

            if (role == ETrackedControllerRole.RightHand)
            {
                // Right hand: Inner wrist is on the Left side (-X)
                xOffset = -0.07f;   
                yOffset = -0.01f;   
                zOffset = 0.15f;    
                
                // Base: Face=-X, Up=+Y, Right=+Z
                // Apply rotation around Face (-X)
                
                f0=-1; f1=0; f2=0;

                // Rotate Up & Right
                r0 = 0;
                r1 = sin;
                r2 = cos;
                
                u0 = 0;
                u1 = cos;
                u2 = -sin;
            }
            else
            {
                // Left hand: Inner wrist is on the Right side (+X)
                xOffset = 0.07f;
                yOffset = -0.01f;
                zOffset = 0.15f;
                
                // Base: Face=+X, Up=+Y, Right=-Z
                // Apply rotation around Face (+X)
                
                f0=1; f1=0; f2=0;

                // Rotate Up & Right (Symmetrical rotation)
                r0 = 0;
                r1 = -sin;
                r2 = -cos;
                
                u0 = 0;
                u1 = cos;
                u2 = -sin;
            }
            
            var controllerTransform = new HmdMatrix34_t
            {
                m0 = r0, m1 = u0, m2 = f0, m3 = xOffset,
                m4 = r1, m5 = u1, m6 = f1, m7 = yOffset,
                m8 = r2, m9 = u2, m10 = f2, m11 = zOffset
            };

            OpenVR.Overlay.SetOverlayTransformTrackedDeviceRelative(
                overlay.Handle,
                deviceIndex,
                ref controllerTransform
            );
        }

        static void AttachAboveHead(Overlay overlay)
        {
            // Attach relative to HMD
            uint hmdIndex = OpenVR.k_unTrackedDeviceIndex_Hmd;
            
            var hmdTransform = new HmdMatrix34_t
            {
                m0 = 1, m1 = 0, m2 = 0, m3 = 0,
                m4 = 0, m5 = 1, m6 = 0, m7 = 0.3f,   // Above
                m8 = 0, m9 = 0, m10 = 1, m11 = -0.5f // In front
            };

            OpenVR.Overlay.SetOverlayTransformTrackedDeviceRelative(
                overlay.Handle,
                hmdIndex,
                ref hmdTransform
            );
        }

        static void CreateOverlayImage(string path, List<TerrorInfo> terrors, string roundType)
        {
            if (!OperatingSystem.IsWindows())
            {
                Console.WriteLine("[VROverlay] Image generation only supported on Windows");
                return;
            }

            int width = 420;
            int terrorHeaderHeight = 28;
            int abilityLineHeight = 22;
            int terrorSpacing = 12;
            int padding = 16;
            
            // Calculate total height based on content
            int contentHeight = 0;
            if (!string.IsNullOrEmpty(roundType))
            {
                contentHeight += 24; // Round type header
            }
            
            foreach (var terror in terrors)
            {
                contentHeight += terrorHeaderHeight; // Terror name
                // Add height for abilities (max 4 to avoid too long overlay)
                int abilitiesToShow = Math.Min(terror.Abilities.Count, 4);
                contentHeight += abilitiesToShow * abilityLineHeight;
                contentHeight += terrorSpacing;
            }
            
            if (terrors.Count == 0)
            {
                contentHeight = 40; // Waiting message
            }
            
            int height = padding * 2 + Math.Max(40, contentHeight);

            using var bitmap = new Bitmap(width, height);
            using var g = Graphics.FromImage(bitmap);
            
            // Semi-transparent dark background
            g.Clear(Color.FromArgb(230, 15, 15, 20));
            
            // Enable anti-aliasing for smoother text
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAlias;

            // Draw border
            using var borderPen = new Pen(Color.FromArgb(200, 0, 140, 255), 2);
            g.DrawRectangle(borderPen, 1, 1, width - 3, height - 3);

            using var terrorFont = new Font("Segoe UI", 12, FontStyle.Bold);
            using var abilityLabelFont = new Font("Segoe UI", 9, FontStyle.Bold);
            using var abilityValueFont = new Font("Segoe UI", 9, FontStyle.Regular);
            using var roundFont = new Font("Segoe UI", 9, FontStyle.Italic);
            using var whiteBrush = new SolidBrush(Color.White);
            using var grayBrush = new SolidBrush(Color.FromArgb(160, 160, 160));
            using var accentBrush = new SolidBrush(Color.FromArgb(80, 180, 255));
            using var labelBrush = new SolidBrush(Color.FromArgb(100, 200, 255));

            int y = padding;

            // Draw round type if available
            if (!string.IsNullOrEmpty(roundType))
            {
                g.DrawString($"Round: {roundType}", roundFont, grayBrush, padding, y);
                y += 24;
            }

            // Draw terrors with abilities
            if (terrors.Count == 0)
            {
                g.DrawString("Waiting for terrors...", terrorFont, grayBrush, padding, y);
            }
            else
            {
                for (int i = 0; i < terrors.Count; i++)
                {
                    var terror = terrors[i];
                    
                    // Parse and use terror color if available
                    Color terrorColor = Color.FromArgb(80, 180, 255);
                    if (!string.IsNullOrEmpty(terror.Color))
                    {
                        try
                        {
                            var parts = terror.Color.Split(',').Select(s => int.Parse(s.Trim())).ToArray();
                            if (parts.Length >= 3)
                            {
                                terrorColor = Color.FromArgb(parts[0], parts[1], parts[2]);
                            }
                        }
                        catch { /* Use default color */ }
                    }
                    
                    // Draw color indicator bar
                    using var colorBrush = new SolidBrush(terrorColor);
                    g.FillRectangle(colorBrush, padding, y + 4, 4, terrorHeaderHeight - 8);
                    
                    // Draw terror name
                    g.DrawString(terror.Name, terrorFont, whiteBrush, padding + 12, y);
                    y += terrorHeaderHeight;
                    
                    // Draw abilities (max 4)
                    int abilitiesShown = 0;
                    foreach (var ability in terror.Abilities.Take(4))
                    {
                        string abilityText = $"{ability.Label}: ";
                        var labelSize = g.MeasureString(abilityText, abilityLabelFont);
                        
                        g.DrawString(abilityText, abilityLabelFont, labelBrush, padding + 12, y);
                        g.DrawString(ability.Value, abilityValueFont, grayBrush, padding + 12 + labelSize.Width - 4, y);
                        y += abilityLineHeight;
                        abilitiesShown++;
                    }
                    
                    // Show "..." if more abilities
                    if (terror.Abilities.Count > 4)
                    {
                        // Don't add more y height, just note it
                    }
                    
                    y += terrorSpacing;
                }
            }

            bitmap.Save(path, ImageFormat.Png);
        }
    }
}
