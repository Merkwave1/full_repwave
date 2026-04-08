// lib/shared_widgets/unified_app_bar.dart
import 'package:flutter/material.dart';

class UnifiedAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final IconData? leadingIcon;
  final VoidCallback? onLeadingTap;
  final double height;

  const UnifiedAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.leadingIcon,
    this.onLeadingTap,
    this.height = 90,
  });

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        bottomLeft: Radius.circular(28),
        bottomRight: Radius.circular(28),
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [theme.primaryColor, theme.primaryColor.withOpacity(0.75)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: theme.primaryColor.withOpacity(0.35),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Row(
              crossAxisAlignment: subtitle == null ? CrossAxisAlignment.center : CrossAxisAlignment.start,
              children: [
                if (leadingIcon != null)
                  InkWell(
                    onTap: onLeadingTap,
                    borderRadius: BorderRadius.circular(30),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(leadingIcon, color: Colors.white),
                    ),
                  ),
                if (leadingIcon != null) const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white.withOpacity(0.9),
                            letterSpacing: 0.3,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                if (actions != null && actions!.isNotEmpty)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: actions!
                        .map(
                          (w) => Padding(
                            padding: const EdgeInsets.only(left: 4.0),
                            child: _ActionWrapper(child: w),
                          ),
                        )
                        .toList(),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionWrapper extends StatelessWidget {
  final Widget child;
  const _ActionWrapper({required this.child});
  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Material(
        color: Colors.white.withOpacity(0.12),
        child: InkWell(
          onTap: () {
            final onPressed = _extractOnPressed(child);
            if (onPressed != null) onPressed();
          },
          child: SizedBox(
            height: 40,
            width: 40,
            child: Center(
              child: IconTheme(
                data: const IconThemeData(color: Colors.white),
                child: _extractIcon(child) ?? child,
              ),
            ),
          ),
        ),
      ),
    );
  }

  VoidCallback? _extractOnPressed(Widget w) {
    if (w is IconButton) return w.onPressed;
    return null;
  }

  Widget? _extractIcon(Widget w) {
    if (w is IconButton) return w.icon;
    return null;
  }
}
