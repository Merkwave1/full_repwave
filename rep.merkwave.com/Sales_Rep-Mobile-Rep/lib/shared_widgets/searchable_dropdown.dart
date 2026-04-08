// lib/shared_widgets/searchable_dropdown.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';

/// A generic model for options used in SearchableDropdown.
/// T is the actual type of the value (e.g., Client, Warehouse, ProductVariant).
class DropdownOption<T> {
  final T value;
  final String label; // The text to display in the dropdown list

  DropdownOption({required this.value, required this.label});

  // Override == and hashCode for proper comparison in dropdowns
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DropdownOption<T> && other.value == value;
  }

  @override
  int get hashCode => value.hashCode;
}

/// A reusable Searchable Dropdown component for Flutter.
/// Allows typing directly into the main field to search and filter options.
class SearchableDropdown<T> extends StatefulWidget {
  final List<DropdownOption<T>> options;
  final DropdownOption<T>? value; // The currently selected option
  final ValueChanged<DropdownOption<T>?> onChanged; // Callback when a new option is selected
  final String hintText;
  final String? labelText;
  final String searchPlaceholder; // Still used for internal logic/clarity, but not displayed as a separate field
  final FormFieldValidator<DropdownOption<T>>? validator;
  final bool enabled; // New property to enable/disable the dropdown
  final Color? Function(DropdownOption<T>)? itemBackgroundColor; // Optional background color for items
  final Color? Function(DropdownOption<T>)? itemTextColor; // Optional text color for items
  final Color? Function(DropdownOption<T>)? itemBorderColor; // Optional border color for items

  const SearchableDropdown({
    super.key,
    required this.options,
    this.value,
    required this.onChanged,
    required this.hintText,
    this.labelText,
    required this.searchPlaceholder, // Keep this for consistency, even if not explicitly shown
    this.validator,
    this.enabled = true, // Default to true
    this.itemBackgroundColor,
    this.itemTextColor,
    this.itemBorderColor,
  });

  @override
  State<SearchableDropdown<T>> createState() => _SearchableDropdownState<T>();
}

class _SearchableDropdownState<T> extends State<SearchableDropdown<T>> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();

  @override
  void initState() {
    super.initState();
    // Initialize controller with current value label
    _searchController.text = widget.value?.label ?? '';
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void didUpdateWidget(covariant SearchableDropdown<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update controller text if the selected value changes externally
    if (widget.value != oldWidget.value) {
      _searchController.text = widget.value?.label ?? '';
      // Move cursor to end after updating text
      _searchController.selection = TextSelection.fromPosition(
        TextPosition(offset: _searchController.text.length),
      );
    }
    // If enabled state changes, ensure overlay is hidden if disabled
    if (widget.enabled != oldWidget.enabled && !widget.enabled) {
      _hideOverlay();
      _focusNode.unfocus();
    }
  }

  @override
  void dispose() {
    _focusNode.removeListener(_handleFocusChange);
    _focusNode.dispose();
    _searchController.dispose();
    _hideOverlay();
    super.dispose();
  }

  void _handleFocusChange() {
    if (widget.enabled) {
      // Only show/hide overlay if enabled
      if (_focusNode.hasFocus) {
        _showOverlay();
      } else {
        _hideOverlay();
      }
    } else {
      _hideOverlay(); // Ensure overlay is hidden if focus changes while disabled
    }
  }

  void _showOverlay() {
    if (_overlayEntry != null) return;
    if (!widget.enabled) return; // Do not show overlay if disabled

    _overlayEntry = OverlayEntry(
      builder: (context) {
        return GestureDetector(
          // Close dropdown when tapping outside the overlay
          behavior: HitTestBehavior.translucent,
          onTap: () {
            // Be extra defensive: explicitly remove overlay first,
            // then unfocus to ensure no invisible absorber remains.
            _hideOverlay();
            _focusNode.unfocus();
          },
          child: ColoredBox(
            color: Colors.transparent, // Make it transparent to allow taps through
            child: Stack(
              children: [
                Positioned(
                  width: _getDropdownWidth(),
                  child: CompositedTransformFollower(
                    link: _layerLink,
                    showWhenUnlinked: false,
                    offset: Offset(0.0, _getDropdownOffset()),
                    child: Material(
                      elevation: 4.0,
                      borderRadius: BorderRadius.circular(12),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxHeight: Get.height * 0.4), // Max height for dropdown
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Removed the internal TextField for search
                            Expanded(
                              child: ValueListenableBuilder<TextEditingValue>(
                                // ADDED ValueListenableBuilder
                                valueListenable: _searchController,
                                builder: (context, textEditingValue, child) {
                                  final filteredOptions = _filteredOptions(); // Call _filteredOptions here
                                  return ListView.builder(
                                    padding: EdgeInsets.zero,
                                    shrinkWrap: true,
                                    itemCount: filteredOptions.length,
                                    itemBuilder: (context, index) {
                                      final option = filteredOptions[index];
                                      final bgColor = widget.itemBackgroundColor?.call(option);
                                      final textColor = widget.itemTextColor?.call(option);
                                      final borderColor = widget.itemBorderColor?.call(option);
                                      final hasColor = bgColor != null;

                                      return Container(
                                        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: hasColor
                                            ? BoxDecoration(
                                                color: bgColor,
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: borderColor ?? bgColor,
                                                  width: 1,
                                                ),
                                              )
                                            : null,
                                        child: ListTile(
                                          title: Text(
                                            option.label,
                                            style: textColor != null ? TextStyle(color: textColor) : null,
                                          ),
                                          onTap: () {
                                            widget.onChanged(option); // Notify parent of selection
                                            _searchController.text = option.label; // Update main field text
                                            _searchController.selection = TextSelection.fromPosition(
                                              TextPosition(offset: _searchController.text.length),
                                            );
                                            _focusNode.unfocus(); // Hide overlay and keyboard
                                          },
                                        ),
                                      );
                                    },
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    Overlay.of(context).insert(_overlayEntry!);
  }

  double _getDropdownWidth() {
    final RenderBox renderBox = context.findRenderObject() as RenderBox;
    return renderBox.size.width;
  }

  double _getDropdownOffset() {
    final RenderBox renderBox = context.findRenderObject() as RenderBox;
    return renderBox.size.height + 8; // Offset below the input field
  }

  void _hideOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  List<DropdownOption<T>> _filteredOptions() {
    // Trim the search term to handle accidental spaces
    final trimmedSearchTerm = _searchController.text.trim();
    if (trimmedSearchTerm.isEmpty) {
      return widget.options;
    }
    final searchTerm = trimmedSearchTerm.toLowerCase();
    return widget.options.where((option) {
      return option.label.toLowerCase().contains(searchTerm);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextFormField(
        focusNode: _focusNode,
        controller: _searchController, // Use _searchController for the main input
        readOnly: !widget.enabled, // Make read-only when disabled
        decoration: InputDecoration(
          labelText: widget.labelText,
          hintText: widget.hintText,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          suffixIcon: IconButton(
            // Changed to IconButton to allow clearing
            icon: const Icon(Icons.arrow_drop_down),
            onPressed: widget.enabled
                ? () {
                    // Only allow press if enabled
                    // If dropdown is open, unfocus to close. If closed, request focus to open.
                    if (_focusNode.hasFocus) {
                      _focusNode.unfocus();
                    } else {
                      _focusNode.requestFocus();
                    }
                  }
                : null, // Disable button if not enabled
          ),
          // Added clear button if text is not empty and an option is selected
          prefixIcon: widget.enabled && _searchController.text.isNotEmpty && widget.value != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    widget.onChanged(null); // Clear selected value
                    // No need for setState here, ValueListenableBuilder will react
                  },
                )
              : null,
          fillColor: widget.enabled ? null : Colors.grey[200], // Visual cue for disabled
          filled: !widget.enabled, // Fill background when disabled
        ),
        validator: (value) {
          if (widget.validator != null) {
            // The validator needs to check the actual selected value, not just the text in the field
            return widget.validator!(widget.value);
          }
          return null;
        },
        onChanged: (value) {
          if (widget.enabled) {
            // Only call onChanged if enabled
            if (!_focusNode.hasFocus) {
              // Ensure overlay is shown if typing starts
              _focusNode.requestFocus();
            }
            // If text is cleared, and no option is selected, ensure widget.onChanged(null) is called
            if (value.trim().isEmpty && widget.value != null) {
              widget.onChanged(null);
            }
          }
        },
        onTap: widget.enabled
            ? () {
                // Only allow tap if enabled
                // Ensure the overlay is shown when tapping the TextFormField
                _focusNode.requestFocus();
              }
            : null, // Disable tap if not enabled
      ),
    );
  }
}
