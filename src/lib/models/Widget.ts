import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { MAX_WIDGET_CONTENT_LENGTH } from '@/lib/widgetLimits';

export interface WidgetDocument {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const widgetSchema = new Schema<WidgetDocument>(
  {
    id: { type: String, required: true, unique: true },
    content: { type: String, default: '', maxlength: MAX_WIDGET_CONTENT_LENGTH },
  },
  {
    timestamps: true,
    versionKey: false,
    // Disable Mongoose's default `id` virtual so the real `id` path can be stored.
    id: false,
  },
);

export const Widget: Model<WidgetDocument> =
  (models.Widget as Model<WidgetDocument> | undefined) ??
  model<WidgetDocument>('Widget', widgetSchema);
